import express from 'express';
import mongoose from 'mongoose';
import PromptTemplate from '../models/PromptTemplate.js';
import PromptOption from '../models/PromptOption.js';
import { scanHardcodedPrompts } from '../utils/hardcodedPromptScanner.js';
import { renderAssignedPromptTemplate, resolvePromptTemplate } from '../services/promptTemplateResolver.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';

const router = express.Router();

router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));
router.use(requireMenuAccess('prompt-templates'));

function parseBoolean(value, defaultValue = undefined) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeLocation(location = {}) {
  const normalizedStep = location.step === null || location.step === undefined || location.step === ''
    ? null
    : Number(location.step);

  return {
    page: normalizeString(location.page),
    step: Number.isNaN(normalizedStep) ? null : normalizedStep,
    context: normalizeString(location.context),
    field: normalizeString(location.field),
  };
}

function dedupeLocations(locations = []) {
  const seen = new Set();

  return (Array.isArray(locations) ? locations : [])
    .map(normalizeLocation)
    .filter((location) => {
      if (!location.page && !location.context && !location.field) return false;
      const key = `${location.page}|${location.step ?? ''}|${location.context}|${location.field}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeFieldOption(option = {}) {
  if (typeof option === 'string') {
    return {
      value: option,
      label: option,
      description: '',
    };
  }

  return {
    value: normalizeString(option.value),
    label: normalizeString(option.label || option.value),
    description: normalizeString(option.description),
  };
}

function normalizeField(field = {}) {
  return {
    id: normalizeString(field.id),
    label: normalizeString(field.label || field.id),
    description: normalizeString(field.description),
    type: normalizeString(field.type || 'text'),
    placeholder: normalizeString(field.placeholder),
    defaultValue: field.defaultValue ?? '',
    options: Array.isArray(field.options) ? field.options.map(normalizeFieldOption).filter((item) => item.value) : [],
    validation: {
      required: parseBoolean(field.validation?.required ?? field.required, false),
      minLength: field.validation?.minLength ?? field.minLength ?? undefined,
      maxLength: field.validation?.maxLength ?? field.maxLength ?? undefined,
      pattern: normalizeString(field.validation?.pattern ?? field.pattern),
    },
    editable: parseBoolean(field.editable, true),
    category: normalizeString(field.category),
    source: normalizeString(field.source || 'manual'),
    optionCategory: normalizeString(field.optionCategory),
    allowCustomValue: parseBoolean(field.allowCustomValue, true),
    runtimeKey: normalizeString(field.runtimeKey),
  };
}

function extractPlaceholdersFromContent(content = {}) {
  const source = [content.mainPrompt, content.negativePrompt].filter(Boolean).join('\n');
  const tokens = new Set();
  const regex = /{{\s*([^}\s]+)\s*}}|{([^}\s]+)}/g;
  let match;

  while ((match = regex.exec(source)) !== null) {
    const token = (match[1] || match[2] || '').trim();
    if (token) {
      tokens.add(token);
    }
  }

  return Array.from(tokens);
}

function buildFieldList(fields = [], content = {}) {
  const normalizedFields = Array.isArray(fields) ? fields.map(normalizeField).filter((field) => field.id) : [];
  const existingIds = new Set(normalizedFields.map((field) => field.id));

  extractPlaceholdersFromContent(content).forEach((placeholder) => {
    if (existingIds.has(placeholder)) return;
    normalizedFields.push(normalizeField({
      id: placeholder,
      label: placeholder,
      type: 'text',
      editable: true,
      source: 'manual',
    }));
  });

  return normalizedFields;
}

function normalizeTemplatePayload(payload = {}) {
  const content = {
    mainPrompt: normalizeString(payload.content?.mainPrompt),
    negativePrompt: normalizeString(payload.content?.negativePrompt),
  };

  return {
    name: normalizeString(payload.name),
    nameVi: normalizeString(payload.nameVi),
    description: normalizeString(payload.description),
    descriptionVi: normalizeString(payload.descriptionVi),
    purpose: normalizeString(payload.purpose),
    useCase: normalizeString(payload.useCase || 'generic'),
    style: normalizeString(payload.style || 'realistic'),
    templateType: normalizeString(payload.templateType || 'text'),
    sourceType: normalizeString(payload.sourceType || 'manual'),
    sourceKey: normalizeString(payload.sourceKey),
    content,
    fields: buildFieldList(payload.fields, content),
    usedInPages: dedupeLocations(payload.usedInPages),
    assignmentTargets: dedupeLocations(payload.assignmentTargets),
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((tag) => normalizeString(tag)).filter(Boolean)
      : normalizeString(payload.tags)
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    isCore: parseBoolean(payload.isCore, false),
    isActive: parseBoolean(payload.isActive, true),
  };
}

async function clearAssignmentsForTargets(templateId, targets = []) {
  if (!targets.length) return;

  const operations = targets.map((target) => ({
    updateMany: {
      filter: {
        ...(templateId ? { _id: { $ne: templateId } } : {}),
        assignmentTargets: {
          $elemMatch: {
            page: target.page,
            ...(target.step !== null && target.step !== undefined ? { step: target.step } : {}),
            context: target.context,
            field: target.field,
          },
        },
      },
      update: {
        $pull: {
          assignmentTargets: {
            page: target.page,
            ...(target.step !== null && target.step !== undefined ? { step: target.step } : {}),
            context: target.context,
            field: target.field,
          },
        },
      },
    },
  }));

  if (operations.length) {
    await PromptTemplate.bulkWrite(operations);
  }
}

async function getMetadataPayload() {
  const [optionCategories, templates] = await Promise.all([
    PromptOption.distinct('category', { isActive: true }),
    PromptTemplate.find({ isActive: true }).select('usedInPages assignmentTargets useCase templateType').lean(),
  ]);

  const locationMap = new Map();

  templates.forEach((template) => {
    [...(template.usedInPages || []), ...(template.assignmentTargets || [])].forEach((location) => {
      const normalized = normalizeLocation(location);
      if (!normalized.page && !normalized.context && !normalized.field) return;
      const key = `${normalized.page}|${normalized.step ?? ''}|${normalized.context}|${normalized.field}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, normalized);
      }
    });
  });

  [
    { page: 'SmartPromptBuilder', step: null, context: 'change-clothes', field: 'mainPrompt' },
    { page: 'SmartPromptBuilder', step: null, context: 'character-holding-product', field: 'mainPrompt' },
    { page: 'AffiliateVideoTikTokFlow', step: 1, context: 'chatgpt-analysis', field: 'analysisPrompt' },
  ].forEach((location) => {
    const normalized = normalizeLocation(location);
    const key = `${normalized.page}|${normalized.step ?? ''}|${normalized.context}|${normalized.field}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, normalized);
    }
  });

  return {
    optionCategories: optionCategories.sort(),
    fieldTypes: ['text', 'textarea', 'select', 'number', 'checkbox', 'radio', 'date', 'color'],
    fieldSources: ['manual', 'option', 'system'],
    templateTypes: ['text', 'video', 'image', 'hybrid'],
    locations: Array.from(locationMap.values()).sort((a, b) => {
      const left = `${a.page}|${a.context}|${a.field}`;
      const right = `${b.page}|${b.context}|${b.field}`;
      return left.localeCompare(right);
    }),
  };
}

router.get('/metadata', async (req, res) => {
  try {
    const data = await getMetadataPayload();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching prompt template metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metadata' });
  }
});

router.get('/', async (req, res) => {
  try {
    const {
      useCase,
      isCore,
      page,
      step,
      context,
      field,
      assigned,
      templateType,
      sourceType,
      q,
      isActive = true,
    } = req.query;

    const filter = {};
    const andClauses = [];
    const activeValue = parseBoolean(isActive, true);
    if (activeValue !== undefined) filter.isActive = activeValue;
    if (useCase) filter.useCase = useCase;
    if (templateType) filter.templateType = templateType;
    if (sourceType) filter.sourceType = sourceType;
    if (isCore !== undefined) filter.isCore = parseBoolean(isCore, false);
    if (page) filter['usedInPages.page'] = page;
    if (step !== undefined && step !== '') filter['usedInPages.step'] = Number(step);
    if (context) filter['usedInPages.context'] = context;
    if (field) filter['usedInPages.field'] = field;
    if (parseBoolean(assigned) === true) {
      filter.assignmentTargets = { $exists: true, $ne: [] };
    }
    if (parseBoolean(assigned) === false) {
      andClauses.push({
        $or: [
        { assignmentTargets: { $exists: false } },
        { assignmentTargets: { $size: 0 } },
        ],
      });
    }
    if (q) {
      andClauses.push({
        $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { purpose: { $regex: q, $options: 'i' } },
        { useCase: { $regex: q, $options: 'i' } },
        { sourceKey: { $regex: q, $options: 'i' } },
        ],
      });
    }
    if (andClauses.length) {
      filter.$and = andClauses;
    }

    const templates = await PromptTemplate.find(filter).sort({
      isCore: -1,
      'assignmentTargets.0': -1,
      updatedAt: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.get('/usecase/:useCase', async (req, res) => {
  try {
    const templates = await PromptTemplate.find({ useCase: req.params.useCase, isActive: true })
      .sort({ isCore: -1, updatedAt: -1 });

    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    console.error('Error fetching templates by use case:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.get('/core', async (req, res) => {
  try {
    const templates = await PromptTemplate.findCoreTemplates();
    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    console.error('Error fetching core templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch core templates' });
  }
});

router.get('/page/:page', async (req, res) => {
  try {
    const templates = await PromptTemplate.findByPage(req.params.page);
    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    console.error('Error fetching templates by page:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.get('/page/:page/step/:step', async (req, res) => {
  try {
    const templates = await PromptTemplate.findByPageAndStep(req.params.page, Number(req.params.step));
    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    console.error('Error fetching templates by page/step:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.get('/resolve', async (req, res) => {
  try {
    const template = await resolvePromptTemplate({
      page: req.query.page,
      step: req.query.step,
      context: req.query.context,
      field: req.query.field,
      useCase: req.query.useCase,
      templateType: req.query.templateType,
    });

    res.json({ success: true, data: template || null });
  } catch (error) {
    console.error('Error resolving template:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve template' });
  }
});

router.get('/hardcoded/scan', async (req, res) => {
  try {
    const templates = await scanHardcodedPrompts();
    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    console.error('Error scanning hardcoded prompts:', error);
    res.status(500).json({ success: false, error: 'Failed to scan hardcoded prompts' });
  }
});

router.post('/hardcoded/sync', async (req, res) => {
  try {
    const scannedTemplates = await scanHardcodedPrompts();

    const operations = scannedTemplates.map((template) => {
      const fields = buildFieldList(template.fields, template.content);
      const usedInPages = dedupeLocations(template.usedInPages);

      return {
        updateOne: {
          filter: { sourceKey: template.sourceKey },
          update: {
            $set: {
              name: template.name,
              description: template.description,
              purpose: template.purpose,
              useCase: template.useCase,
              templateType: template.templateType,
              sourceType: template.sourceType,
              content: template.content,
              fields,
              usedInPages,
              tags: template.tags,
              isActive: true,
              isCore: true,
            },
            $setOnInsert: {
              style: 'realistic',
              sourceKey: template.sourceKey,
              assignmentTargets: usedInPages,
              createdBy: req.user?.id || 'hardcoded-sync',
            },
          },
          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      await PromptTemplate.bulkWrite(operations);
    }

    const sourceKeys = scannedTemplates.map((item) => item.sourceKey);
    if (sourceKeys.length > 0) {
      await PromptTemplate.updateMany(
        { sourceType: 'hardcoded-scan', sourceKey: { $nin: sourceKeys } },
        { $set: { isActive: false } }
      );
    }

    res.json({
      success: true,
      message: 'Hardcoded prompts synced successfully',
      count: scannedTemplates.length,
    });
  } catch (error) {
    console.error('Error syncing hardcoded prompts:', error);
    res.status(500).json({ success: false, error: 'Failed to sync hardcoded prompts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizeTemplatePayload(req.body);
    if (!payload.name || !payload.content.mainPrompt) {
      return res.status(400).json({ success: false, error: 'Name and mainPrompt are required' });
    }

    if (payload.assignmentTargets.length) {
      await clearAssignmentsForTargets(null, payload.assignmentTargets);
    }

    const template = await PromptTemplate.create({
      ...payload,
      createdBy: req.user?.id || 'api',
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

router.post('/resolve', async (req, res) => {
  try {
    const result = await renderAssignedPromptTemplate({
      criteria: req.body.criteria || req.body,
      inputValues: req.body.inputValues || req.body.fieldValues || {},
      runtimeValues: req.body.runtimeValues || {},
    });

    res.json({
      success: true,
      data: result
        ? {
            templateId: result.template._id,
            templateName: result.template.name,
            prompt: result.rendered.prompt,
            negativePrompt: result.rendered.negativePrompt,
            values: result.values,
          }
        : null,
    });
  } catch (error) {
    console.error('Error resolving prompt template:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve prompt template' });
  }
});

router.post('/:id/clone', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const originalTemplate = await PromptTemplate.findById(req.params.id);
    if (!originalTemplate) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const cloneName = normalizeString(req.body.name) || `${originalTemplate.name} (Copy)`;

    const clonedTemplate = await PromptTemplate.create({
      name: cloneName,
      nameVi: originalTemplate.nameVi,
      description: originalTemplate.description,
      descriptionVi: originalTemplate.descriptionVi,
      purpose: originalTemplate.purpose,
      useCase: originalTemplate.useCase,
      style: originalTemplate.style,
      templateType: originalTemplate.templateType,
      sourceType: 'manual',
      content: originalTemplate.content,
      fields: originalTemplate.fields,
      usedInPages: originalTemplate.usedInPages,
      assignmentTargets: [],
      tags: originalTemplate.tags,
      metadata: originalTemplate.metadata,
      isCore: false,
      isClone: true,
      parentTemplateId: originalTemplate._id,
      version: 1,
      createdBy: req.user?.id || 'api',
    });

    res.status(201).json({
      success: true,
      data: clonedTemplate,
      message: 'Template cloned successfully',
    });
  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({ success: false, error: 'Failed to clone template' });
  }
});

router.post('/:id/render', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const rendered = template.getRenderedPrompt(req.body.fieldValues || {});
    await template.incrementUsage();

    res.json({
      success: true,
      data: {
        ...rendered,
        templateId: template._id,
        templateName: template.name,
      },
    });
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ success: false, error: 'Failed to render template' });
  }
});

router.post('/:id/usage', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    await template.incrementUsage();
    res.json({
      success: true,
      data: {
        usageCount: template.usageCount,
        lastUsed: template.lastUsed,
      },
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ success: false, error: 'Failed to track usage' });
  }
});

router.post('/:id/assign', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const targets = dedupeLocations(req.body.targets);
    if (!targets.length) {
      return res.status(400).json({ success: false, error: 'At least one assignment target is required' });
    }

    await clearAssignmentsForTargets(template._id, targets);
    template.assignmentTargets = dedupeLocations([...(template.assignmentTargets || []), ...targets]);
    await template.save();

    res.json({
      success: true,
      data: template,
      message: 'Template assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning template:', error);
    res.status(500).json({ success: false, error: 'Failed to assign template' });
  }
});

router.post('/:id/unassign', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const targets = dedupeLocations(req.body.targets);
    if (!targets.length) {
      template.assignmentTargets = [];
    } else {
      const targetKeys = new Set(targets.map((target) => `${target.page}|${target.step ?? ''}|${target.context}|${target.field}`));
      template.assignmentTargets = (template.assignmentTargets || []).filter((target) => {
        const key = `${target.page}|${target.step ?? ''}|${target.context}|${target.field}`;
        return !targetKeys.has(key);
      });
    }

    await template.save();

    res.json({
      success: true,
      data: template,
      message: 'Template unassigned successfully',
    });
  } catch (error) {
    console.error('Error unassigning template:', error);
    res.status(500).json({ success: false, error: 'Failed to unassign template' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    if (template.isCore) {
      return res.status(403).json({
        success: false,
        error: 'Cannot edit core templates directly. Clone and customize instead.',
      });
    }

    const payload = normalizeTemplatePayload({ ...template.toObject(), ...req.body });
    if (!payload.name || !payload.content.mainPrompt) {
      return res.status(400).json({ success: false, error: 'Name and mainPrompt are required' });
    }

    if (payload.assignmentTargets.length) {
      await clearAssignmentsForTargets(template._id, payload.assignmentTargets);
    }

    Object.assign(template, payload, {
      version: (template.version || 1) + 1,
    });
    await template.save();

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

router.put('/:id/usage-location', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const location = normalizeLocation(req.body);
    if (!location.page && !location.context) {
      return res.status(400).json({ success: false, error: 'page or context is required' });
    }

    const action = normalizeString(req.body.action || 'add');
    const locationKey = `${location.page}|${location.step ?? ''}|${location.context}|${location.field}`;

    if (action === 'remove') {
      template.usedInPages = (template.usedInPages || []).filter((item) => {
        const key = `${item.page}|${item.step ?? ''}|${item.context}|${item.field}`;
        return key !== locationKey;
      });
    } else {
      template.usedInPages = dedupeLocations([...(template.usedInPages || []), location]);
    }

    await template.save();

    res.json({
      success: true,
      data: template,
      message: 'Usage location updated successfully',
    });
  } catch (error) {
    console.error('Error updating usage location:', error);
    res.status(500).json({ success: false, error: 'Failed to update usage location' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    if (!template.canDelete()) {
      return res.status(403).json({ success: false, error: 'Cannot delete core templates' });
    }

    await PromptTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

export default router;
