import PromptTemplate from '../models/PromptTemplate.js';

// Get all templates for user
export const getTemplates = async (req, res) => {
  try {
    const { type, isDefault } = req.query;
    const userId = req.user?._id;

    const filter = {
      isActive: true,
      $or: [
        { userId: userId }, // User's own templates
        { isSystem: true }, // System templates
      ],
    };

    if (type) {
      filter.type = type;
    }
    if (isDefault === 'true') {
      filter.isDefault = true;
    }

    const templates = await PromptTemplate.find(filter)
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[PromptTemplate] getTemplates error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single template by ID
export const getTemplateById = async (req, res) => {
  try {
    const template = await PromptTemplate.findById(req.params.id).lean();

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: 'Template không tồn tại' });
    }

    // Check access
    const userId = req.user?._id;
    if (template.userId && template.userId.toString() !== userId.toString() && !template.isSystem) {
      return res
        .status(403)
        .json({ success: false, message: 'Không có quyền truy cập template này' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('[PromptTemplate] getTemplateById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new template
export const createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      content,
      placeholders,
      variables,
      provider,
      isDefault,
    } = req.body;

    const userId = req.user?._id;

    // Extract placeholders from content if not provided
    let extractedPlaceholders = placeholders;
    if (!placeholders && content) {
      const regex = /\{\{([^}]+)\}\}/g;
      const matches = [...content.matchAll(regex)];
      extractedPlaceholders = [...new Set(matches.map((m) => m[1].trim()))];
    }

    const template = await PromptTemplate.create({
      name,
      description,
      type,
      content,
      placeholders: extractedPlaceholders,
      variables,
      provider,
      userId,
      isDefault: isDefault || false,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('[PromptTemplate] createTemplate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update template
export const updateTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      content,
      placeholders,
      variables,
      provider,
      isDefault,
    } = req.body;

    const template = await PromptTemplate.findById(req.params.id);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: 'Template không tồn tại' });
    }

    // Check ownership
    const userId = req.user?._id;
    if (template.userId && template.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'Không có quyền chỉnh sửa template này' });
    }

    // Update fields
    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (type !== undefined) template.type = type;
    if (content !== undefined) {
      template.content = content;
      // Re-extract placeholders
      if (!placeholders) {
        const regex = /\{\{([^}]+)\}\}/g;
        const matches = [...content.matchAll(regex)];
        template.placeholders = [...new Set(matches.map((m) => m[1].trim()))];
      } else {
        template.placeholders = placeholders;
      }
    }
    if (variables !== undefined) template.variables = variables;
    if (provider !== undefined) template.provider = provider;
    if (isDefault !== undefined) template.isDefault = isDefault;

    await template.save();

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('[PromptTemplate] updateTemplate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete template (soft delete)
export const deleteTemplate = async (req, res) => {
  try {
    const template = await PromptTemplate.findById(req.params.id);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: 'Template không tồn tại' });
    }

    // Check ownership - can't delete system templates
    const userId = req.user?._id;
    if (template.isSystem) {
      return res
        .status(403)
        .json({ success: false, message: 'Không thể xóa system template' });
    }

    if (template.userId && template.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'Không có quyền xóa template này' });
    }

    template.isActive = false;
    await template.save();

    res.json({ success: true, message: 'Template đã được xóa' });
  } catch (error) {
    console.error('[PromptTemplate] deleteTemplate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Preview template with sample data
export const previewTemplate = async (req, res) => {
  try {
    const { templateId, data } = req.body;

    const template = await PromptTemplate.findById(templateId);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: 'Template không tồn tại' });
    }

    // Replace placeholders with data
    let filledContent = template.content;
    
    for (const [key, value] of Object.entries(data || {})) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      filledContent = filledContent.replace(regex, value);
    }

    // Check for remaining unfilled placeholders
    const unfilledRegex = /\{\{([^}]+)\}\}/g;
    const unfilled = [...filledContent.matchAll(unfilledRegex)].map((m) => m[1].trim());

    res.json({
      success: true,
      data: {
        templateId,
        originalContent: template.content,
        filledContent,
        unfilledPlaceholders: unfilled,
        variables: template.variables,
      },
    });
  } catch (error) {
    console.error('[PromptTemplate] previewTemplate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
