import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {photographySite, CONTENT_ID, CONTENT_TYPE} from './schemas/photographySite.js';

// Only public identifiers are allowed here. Sanity authenticates each editor itself.
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;
if (!projectId || !dataset) throw new Error('Studio public project ID and dataset must be configured before building.');

export default defineConfig({
  name: 'walt-photography',
  title: 'Walt Dublin Photography',
  projectId,
  dataset,
  // CLI project.basePath supplies /studio; a second /studio here would duplicate it.
  basePath: '/',
  plugins: [structureTool({
    structure: (S) => S.list().title('Your website').items([
      S.listItem().id(CONTENT_ID).title('Edit Walt Dublin Photography').child(
        S.document().schemaType(CONTENT_TYPE).documentId(CONTENT_ID).title('Your website'),
      ),
    ]),
  })],
  schema: {types: [photographySite], templates: (templates) => templates.filter((template) => template.schemaType !== CONTENT_TYPE)},
  document: {
    newDocumentOptions: (options) => options.filter((option) => option.templateId !== CONTENT_TYPE),
    actions: (actions, context) => context.schemaType === CONTENT_TYPE
      ? actions.filter((action) => !['delete', 'duplicate', 'unpublish'].includes(action.action))
      : actions,
  },
});
