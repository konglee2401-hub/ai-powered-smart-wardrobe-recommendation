import dotenv from 'dotenv';
import connectDB from '../../config/db.js';
import PromptTemplate from '../../models/PromptTemplate.js';
import { scanHardcodedPrompts } from '../../utils/hardcodedPromptScanner.js';

dotenv.config();

async function run() {
  await connectDB();

  const scannedTemplates = await scanHardcodedPrompts();
  const operations = scannedTemplates.map((template) => ({
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
          usedInPages: template.usedInPages,
          tags: template.tags,
          isActive: true,
          isCore: true,
        },
        $setOnInsert: {
          style: 'realistic',
          assignmentTargets: template.usedInPages,
          createdBy: 'seed-script',
        },
      },
      upsert: true,
    },
  }));

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

  console.log(`[prompt-templates] seeded ${scannedTemplates.length} template(s)`);
  process.exit(0);
}

run().catch((error) => {
  console.error('[prompt-templates] seed failed:', error);
  process.exit(1);
});
