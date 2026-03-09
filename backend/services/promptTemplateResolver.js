import PromptTemplate from '../models/PromptTemplate.js';

function normalizeLocation(location = {}) {
  return {
    page: String(location.page || '').trim(),
    step: location.step === null || location.step === undefined || location.step === '' ? null : Number(location.step),
    context: String(location.context || '').trim(),
    field: String(location.field || '').trim(),
  };
}

function buildLocationQuery(prefix, location = {}) {
  const normalized = normalizeLocation(location);
  const query = {};

  if (normalized.page) query[`${prefix}.page`] = normalized.page;
  if (normalized.step !== null && !Number.isNaN(normalized.step)) query[`${prefix}.step`] = normalized.step;
  if (normalized.context) query[`${prefix}.context`] = normalized.context;
  if (normalized.field) query[`${prefix}.field`] = normalized.field;

  return query;
}

function getValueByPath(source, path) {
  if (!source || !path) return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, source);
}

function flattenRuntimeValues(source, prefix = '', output = {}) {
  if (source === null || source === undefined) return output;
  if (Array.isArray(source)) {
    output[prefix] = source.join(', ');
    return output;
  }

  if (typeof source !== 'object') {
    if (prefix) output[prefix] = source;
    return output;
  }

  Object.entries(source).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}_${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenRuntimeValues(value, nextPrefix, output);
    } else if (nextPrefix) {
      output[nextPrefix] = value;
    }
  });

  return output;
}

function resolveFieldValue(field = {}, inputValues = {}, runtimeValues = {}) {
  if (Object.prototype.hasOwnProperty.call(inputValues, field.id)) {
    return inputValues[field.id];
  }

  if (field.runtimeKey) {
    const runtimeValue = getValueByPath(runtimeValues, field.runtimeKey);
    if (runtimeValue !== undefined) return runtimeValue;
  }

  if (field.source === 'option' && field.optionCategory) {
    const optionValue =
      getValueByPath(runtimeValues, `selectedOptions.${field.optionCategory}`) ??
      getValueByPath(runtimeValues, field.optionCategory);
    if (optionValue !== undefined) return optionValue;
  }

  if (field.source === 'system') {
    const systemValue =
      getValueByPath(runtimeValues, field.id) ??
      getValueByPath(runtimeValues, `system.${field.id}`);
    if (systemValue !== undefined) return systemValue;
  }

  return field.defaultValue ?? '';
}

export function buildTemplateValueMap(template, inputValues = {}, runtimeValues = {}) {
  const templateValues = {
    ...flattenRuntimeValues(runtimeValues),
  };

  (template?.fields || []).forEach((field) => {
    if (!field?.id) return;
    templateValues[field.id] = resolveFieldValue(field, inputValues, runtimeValues);
  });

  Object.entries(inputValues || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      templateValues[key] = value;
    }
  });

  return templateValues;
}

export async function resolvePromptTemplate(criteria = {}) {
  const {
    page,
    step,
    context,
    field,
    useCase,
    templateType,
  } = criteria;

  const location = { page, step, context, field };

  const assigned = await PromptTemplate.findAssignedTemplate({
    ...location,
    useCase,
    templateType,
  });

  if (assigned) {
    return assigned;
  }

  const usedInPagesQuery = {
    isActive: true,
    ...buildLocationQuery('usedInPages', location),
  };
  if (useCase) usedInPagesQuery.useCase = useCase;
  if (templateType) usedInPagesQuery.templateType = templateType;

  const fallbackByLocation = await PromptTemplate.findOne(usedInPagesQuery)
    .sort({ isCore: -1, updatedAt: -1, createdAt: -1 });

  if (fallbackByLocation) {
    return fallbackByLocation;
  }

  const hasLocationCriteria = Boolean(
    location.page ||
    (location.step !== null && location.step !== undefined && location.step !== '') ||
    location.context ||
    location.field
  );

  const locationScopedClauses = hasLocationCriteria
    ? [
        {
          $and: [
            { $or: [{ assignmentTargets: { $exists: false } }, { 'assignmentTargets.0': { $exists: false } }] },
            { $or: [{ usedInPages: { $exists: false } }, { 'usedInPages.0': { $exists: false } }] },
          ],
        },
        buildLocationQuery('assignmentTargets', location),
        buildLocationQuery('usedInPages', location),
      ].filter((clause) => Object.keys(clause).length > 0)
    : [];

  const fallbackByUseCaseQuery = {
    isActive: true,
    ...(useCase ? { useCase } : {}),
    ...(templateType ? { templateType } : {}),
  };

  if (locationScopedClauses.length > 0) {
    fallbackByUseCaseQuery.$or = locationScopedClauses;
  }

  const fallbackByUseCase = await PromptTemplate.findOne(fallbackByUseCaseQuery)
    .sort({ isCore: -1, updatedAt: -1, createdAt: -1 });

  return fallbackByUseCase;
}

export async function renderAssignedPromptTemplate({
  criteria = {},
  inputValues = {},
  runtimeValues = {},
} = {}) {
  const template = await resolvePromptTemplate(criteria);
  if (!template) {
    return null;
  }

  const templateValues = buildTemplateValueMap(template, inputValues, runtimeValues);
  const rendered = template.getRenderedPrompt(templateValues);

  return {
    template,
    rendered,
    values: templateValues,
  };
}
