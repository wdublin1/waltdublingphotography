import {defineField, defineType} from 'sanity';
import defaults from '../../content/default-content.json';
import {PhotoKeyInput} from '../components/PhotoKeyInput.jsx';
import {safeHref} from '../../lib/content-text.mjs';

export const CONTENT_ID = 'walt-photography-site';
export const CONTENT_TYPE = 'photographySite';

const pageTitles = {
  home: 'Home', portfolio: 'My photographs', families: 'Individuals & families', seniors: 'Seniors & graduates',
  athletes: 'Athletes & teams', pricing: 'Sessions & pricing', about: 'About me', reviews: 'Client experiences',
  experience: 'How I work', featured: 'Featured galleries',
  contact: 'Get in touch', clients: 'Client galleries', shared: 'Shared captions & invitations', footer: 'Footer', placements: 'Page photographs',
  meta: 'Search titles & descriptions', testimonials: 'Client reviews',
};
const pageOrder = ['home', 'portfolio', 'experience', 'featured', 'families', 'seniors', 'athletes', 'pricing', 'about', 'reviews', 'contact', 'clients', 'placements', 'shared', 'footer', 'testimonials', 'meta'];
const labels = {
  homeInquiry: 'Homepage inquiry band', familiesHero: 'Families page opening', familiesGalleryOne: 'Families gallery 1', familiesGalleryTwo: 'Families gallery 2', familiesGalleryThree: 'Families gallery 3', familiesGalleryFour: 'Families gallery 4', familiesGalleryFive: 'Families gallery 5', familiesGallerySix: 'Families gallery 6', familiesIndividual: 'Families page individual portrait', familiesGroup: 'Families page group photograph', seniorsHero: 'Seniors page opening', seniorsSport: 'Seniors page athlete link', athletesHero: 'Athletes page opening', athletesPortrait: 'Athletes page portrait', athletesTeam: 'Athletes page team photograph', reviewsHero: 'Reviews page opening',
  headline: 'Page headline', intro: 'Introduction', personalHeadline: 'Personal introduction heading', personalParagraphs: 'Personal introduction paragraphs',
  directoryHeadline: 'Session directory heading', directoryIntro: 'Session directory introduction', services: 'Session links',
  closingHeadline: 'Closing invitation heading', closingCopy: 'Closing invitation text', closingButton: 'Invitation link wording',
  sidebar: 'About sidebar', paragraphs: 'Paragraphs', sections: 'Page sections', sessions: 'Session descriptions',
  teamHeadline: 'Team photography heading', teamParagraphs: 'Team photography paragraphs', faqHeadline: 'Questions heading',
  faqIntro: 'Questions introduction', questions: 'Frequently asked questions', nextHeadline: 'What happens next heading', nextCopy: 'What happens next text',
  timingLabel: 'Timing field label', messageLabel: 'Message field label', messageHelp: 'Message field guidance',
  helpHeadline: 'Gallery help heading', helpCopy: 'Gallery help text', privacyNote: 'Gallery privacy reminder', emailLabel: 'Gallery email link wording',
  name: 'Name', quote: 'Client’s exact words', context: 'Review source', rating: 'Star rating', question: 'Question', answer: 'Answer',
  title: 'Title', description: 'Search description', text: 'Description', note: 'Additional explanation', copy: 'Link description',
  invitationHeadline: 'Default invitation heading', invitationCopy: 'Default invitation text',
  personalPortraitCaption: 'Caption below Walt’s portrait', graduationLinkLabel: 'Graduation photograph link wording',
  athletePhotoCaption: 'Optional sports photograph caption', sportHeadline: 'Graduation and sport heading', sportCopy: 'Graduation and sport text',
  sportLinkLabel: 'Athlete page link wording', naturalLightNote: 'Natural-light planning note',
  eyebrow: 'Small label above the headline', locationLabel: 'Location label', personalEyebrow: 'Personal introduction label',
  directoryEyebrow: 'Session directory label', reviewEyebrow: 'Client review label', location: 'Location wording', signature: 'Signature wording',
  priceCopy: 'Price explanation', familyPriceCopy: 'Family portrait price explanation', individualPriceCopy: 'Individual portrait price explanation',
  priceTemplate: 'Starting-price wording', customPriceLabel: 'Custom-quote wording', quoteExplanation: 'Quote explanation',
  label: 'Link wording', linkLabel: 'Session inquiry link wording', priceKey: 'Linked starting price', type: 'Inquiry session selection',
  inquiryLink: 'Main inquiry link', aboutLink: 'About-me link', pricingLink: 'Pricing link', reviewsLink: 'Client experiences link',
  portfolioLink: 'Portfolio link', heroLink: 'Opening section link', familyLink: 'Family session link', individualLink: 'Individual session link',
  teamLink: 'Team photography link', emailLink: 'Email link', invitationButton: 'Default invitation link wording',
  form: 'Inquiry form wording', personName: 'Name above the contact details', nameLabel: 'Name field label',
  requiredLabel: 'Required-field label', sessionLabel: 'Session field label', undecidedLabel: 'Undecided session option',
  sessionLabels: 'Session option wording', timingPlaceholder: 'Timing field example', disclosure: 'Form reassurance',
  noScriptCopy: 'Message when JavaScript is unavailable', honeypotLabel: 'Spam-check field label', filterLabels: 'Collection filter wording',
  all: 'All photographs', individual: 'Individual portraits', family: 'Family portraits', senior: 'Seniors & graduates',
  athlete: 'Individual athletes', team: 'Team photography', other: 'Other sessions',
  navigation: 'Menus & footer links', collectionsLabel: 'Photography menu label', menuLabel: 'Mobile menu label',
  headerLinks: 'Main menu links', collectionLinks: 'Photography menu links', serviceLinks: 'Service-page navigation links',
  mobileContactLink: 'Mobile contact link', footerPhotographyLinks: 'Footer photography links', footerInformationLinks: 'Footer information links',
  footerEmailLink: 'Footer email link', copyrightText: 'Copyright line',
  interfaceCopy: 'Controls, accessibility & messages', accessibility: 'Screen-reader and navigation wording', social: 'Social icon wording',
  lightbox: 'Photograph viewer', slideshow: 'Homepage slideshow controls', inquiry: 'Inquiry form controls & feedback',
  system: 'Error and unavailable pages', apiMessages: 'Server response messages',
  skipLabel: 'Skip-to-content link', logoHomeLabel: 'Logo description', mainNavigationLabel: 'Main menu description',
  collectionNavigationLabel: 'Photography menu description', mobileNavigationLabel: 'Mobile menu description',
  footerPhotographyLabel: 'Footer photography description', footerInformationLabel: 'Footer information description',
  serviceNavigationLabel: 'Service navigation description', socialNavigationLabel: 'Social links description',
  newTabDescription: 'New-tab announcement', openPhotoTemplate: 'Open-photograph announcement', reviewRatingTemplate: 'Star-rating announcement',
  reviewListLabel: 'Review list description', facebookLabel: 'Facebook icon description', instagramLabel: 'Instagram icon description',
  dialogLabel: 'Dialog description', closeLabel: 'Close control description', previousLabel: 'Previous control description',
  nextLabel: 'Next control description', counterTemplate: 'Photograph counter wording', regionLabel: 'Slideshow description',
  roleDescription: 'Carousel role description', slideRoleDescription: 'Individual slide role description', slideTemplate: 'Slide counter wording',
  controlsLabel: 'Slideshow controls description', playLabel: 'Play control description', pauseLabel: 'Pause control description',
  introductionLabel: 'Introduction section description', filterLabel: 'Filter controls description', oneResultTemplate: 'One-photo result announcement',
  manyResultsTemplate: 'Multiple-photo result announcement', emptyMessage: 'Empty-collection message',
  submitLabel: 'Send button wording', sendingButtonLabel: 'Button wording while sending', sentButtonLabel: 'Button wording after sending',
  sendingMessage: 'Sending status message', successMessage: 'Successful inquiry message', alreadySentMessage: 'Already-sent message',
  tooLongMessage: 'Message when the inquiry is too long', expiredMessage: 'Expired form message', rateLimitMessage: 'Too-many-attempts message',
  validationMessage: 'Check-details message', failureMessage: 'Unconfirmed-delivery message', characterLimitTemplate: 'Character-limit message',
  nameRequiredMessage: 'Missing-name message', emailRequiredMessage: 'Missing-email message', emailInvalidMessage: 'Invalid-email message',
  requiredMessage: 'Other missing-field message', notFoundTitle: 'Missing-page browser title', notFoundHeadline: 'Missing-page heading',
  notFoundCopy: 'Missing-page explanation', notFoundLink: 'Missing-page return link', unavailableTitle: 'Unavailable-page browser title',
  unavailableHeadline: 'Unavailable-page heading', unavailableCopy: 'Unavailable-page explanation', methodNotAllowed: 'Unsupported-request message',
  bookingLabel: 'Main inquiry button wording', bookingHref: 'Main inquiry destination', bookingNewTab: 'Open the main inquiry link in a new tab',
  brandName: 'Business name', businessDescription: 'Business description', areaServed: 'Areas served',
  incompleteForm: 'Incomplete inquiry message', invalidFieldType: 'Unexpected field format message',
  invalidFieldContent: 'Unusual characters or long-content message', requiredName: 'Missing-name message', invalidEmail: 'Invalid-email message',
  invalidSession: 'Unrecognized session choice message', formUnavailable: 'Form-not-ready message', invalidOrigin: 'Wrong contact-page message',
  unsupportedFormat: 'Unsupported form format message', tooLong: 'Oversized inquiry message', malformedRequest: 'Unreadable inquiry message',
  refreshRequired: 'Refresh-the-page message', tokenExpired: 'Expired form message', tooSoon: 'Submitted-too-quickly message',
  emailUnavailable: 'Email delivery unavailable message', sendUnconfirmed: 'Email delivery unconfirmed message',
  experienceEyebrow: 'Session experience label', experienceHeadline: 'Session experience heading',
  experienceIntro: 'Session experience introduction', experienceLink: 'Session experience link',
  featuredEyebrow: 'Featured galleries label', featuredHeadline: 'Featured galleries heading',
  featuredIntro: 'Featured galleries introduction', featuredLink: 'Featured galleries link',
  faqEyebrow: 'Questions label', faqItems: 'Frequently asked questions',
  steps: 'Session process', detailsHeadline: 'Session details heading', sessionDetails: 'Session details',
  inclusions: 'Confirmed session inclusions', duration: 'Session length (optional)', imageCount: 'Edited photograph count (optional)',
  delivery: 'Delivery timeframe (optional)', responseTime: 'Inquiry response time (optional)',
  durationLabel: 'Session length label', imageCountLabel: 'Edited photograph count label', deliveryLabel: 'Delivery timeframe label',
  featuredServiceLinkLabel: 'Gallery-to-service link wording', cardLabel: 'Gallery link wording',
  backLabel: 'Return-to-galleries link wording', photoKey: 'Photograph for this service link',
};
const humanize = (name) => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
const titleFor = (name, path = []) => {
  if (name === 'emailLabel' && path.includes('form')) return 'Email field label';
  if (name === 'emailLabel' && path[0] === 'interfaceCopy') return 'Email icon description';
  if (name === 'dialogLabel' && path[0] === 'interfaceCopy' && path[1] === 'inquiry') return 'Inquiry form description';
  if (name === 'portfolio' && path[0] === 'interfaceCopy') return 'Portfolio controls & messages';
  if (name === 'copy' && path.includes('steps')) return 'Step description';
  if (name === 'title' && path.includes('sessionDetails')) return 'Session name';
  if (labels[name]) return labels[name];
  if (name === 'href') return 'Link destination';
  if (/Href$/.test(name)) return `${humanize(name.replace(/Href$/, ''))} destination`;
  if (/newTab$/i.test(name)) return 'Open this link in a new tab';
  return pageTitles[name] || humanize(name);
};
const memberName = (path) => `${path.join('_')}_item`;
const objectOptions = {collapsible: true, collapsed: false};
const inlineLinkHelp = 'Optional inline link: [words to click](/contact) or [words to click](https://example.com). Keep the rest as normal text.';
const inquiryLabelHelp = 'Use your own wording for this primary inquiry link. Clear it to use the main inquiry wording from Contact & links.';
const hrefHelp = 'Use /contact, /portfolio#section, #section, https://example.com, mailto:{email}, or tel:+17045550123. The {email} token uses the public contact email.';
const priceChoices = [
  {title: 'Individual portraits', value: 'individual'}, {title: 'Family portraits', value: 'family'},
  {title: 'Seniors & graduates', value: 'senior'}, {title: 'Individual athletes', value: 'athlete'},
  {title: 'Custom quote (no fixed starting price)', value: ''},
];
const sessionChoices = [
  {title: 'No preselected session', value: ''},
  ...['Individual portraits', 'Family portraits', 'Senior or graduate portraits', 'Individual athlete portraits', 'Team photography', 'Something else']
    .map((value) => ({title: value, value})),
];
const pageFieldsets = [
  {name: 'intro', title: 'Introduction', options: {collapsible: true, collapsed: false}},
  {name: 'sections', title: 'Page sections & details', options: {collapsible: true, collapsed: false}},
  {name: 'details', title: 'Session details & inclusions', options: {collapsible: true, collapsed: true}},
  {name: 'process', title: 'Session experience', options: {collapsible: true, collapsed: true}},
  {name: 'featured', title: 'Featured galleries', options: {collapsible: true, collapsed: true}},
  {name: 'faq', title: 'Questions & answers', options: {collapsible: true, collapsed: true}},
  {name: 'links', title: 'Links & buttons', options: {collapsible: true, collapsed: true}},
  {name: 'closing', title: 'Closing invitation', options: {collapsible: true, collapsed: true}},
];
const isHref = (name) => name === 'href' || /Href$/.test(name);
const isBodyText = (name, path) => path[0] === 'copy' && !path.includes('meta') && !path.includes('testimonials') && !path.includes('services')
  && /copy|intro|paragraph|text|answer|note|sidebar|disclosure|caption|explanation|^footer$/i.test(name);
const isOptionalLinkLabel = (name) => name === 'label' || name === 'closingButton' || name === 'invitationButton' || /LinkLabel$/.test(name) || name === 'linkLabel';

function validateHref(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string') return 'Enter a link destination as text.';
  if (!value.trim()) return true;
  const resolved = value.replaceAll('{email}', 'hello@example.com');
  if (/[{}]/.test(resolved)) return 'Only the {email} token can be used in a link destination.';
  return Boolean(safeHref(resolved)) || 'Use a path beginning with /, a #section anchor, or an http, https, mailto, or tel link without control characters or embedded credentials.';
}

function descriptionFor(name, value, path) {
  const notes = [];
  if (['duration', 'imageCount', 'delivery', 'responseTime'].includes(name)) notes.push('Optional. Leave blank until you have confirmed this detail. An empty value is not shown on the website; do not enter a placeholder or an unconfirmed promise.');
  if (name === 'photoKey' && path.includes('placements')) notes.push('Choose the photograph shown in this page position. Clear it to use the built-in fallback photograph for that position.');
  else if (name === 'photoKey') notes.push('Choose a photograph from the library for this homepage service link. Clear it to use the service’s built-in photograph.');
  if (name === 'copy' && path.includes('services')) notes.push('Write a short summary for this linked service card. The whole card opens the destination below; any inline links in the summary display their wording only, without separate clickable destinations.');
  if (name === 'inclusions') notes.push('Only include services you actually provide. Use a short, natural first-person sentence for each entry. Put confirmed session length, image count, and delivery in their separate optional fields.');
  if (isOptionalLinkLabel(name)) {
    const primaryLabel = ['closingButton', 'invitationButton'].includes(name)
      || name === 'label' && path[0] === 'copy' && (path.includes('heroLink') || path[1] === 'home' && path.includes('inquiryLink'));
    notes.push(primaryLabel ? inquiryLabelHelp : name === 'label'
      ? 'This link uses its own wording, not the main inquiry wording. Clear this label to hide this link.'
      : 'This link uses its own wording, not the main inquiry wording. Clearing a default-backed text field may restore its built-in value.');
  }
  if (name === 'closingHeadline' || name === 'closingCopy') notes.push('Clear this field to use the corresponding default in Shared captions & invitations.');
  if (name === 'quote') notes.push('Preserve the client’s exact words, spelling, and punctuation.');
  if (isBodyText(name, path) || (path[0] === 'interfaceCopy' && path[1] === 'system' && /Copy$/.test(name))) notes.push(inlineLinkHelp);
  if (name === 'honeypotLabel') notes.push('This wording belongs to the hidden spam-check field. Keep the instruction to leave it empty.');
  if (name === 'successMessage' || name === 'alreadySentMessage') notes.push('Keep it clear that sending an inquiry does not reserve a date.');
  if (path[0] === 'interfaceCopy') notes.push(name === 'counterTemplate' ? 'Leave empty to hide the optional photograph counter.' : 'Leave blank to use the built-in safe wording. Control labels and required feedback always remain available.');
  const tokens = [...new Set(String(value ?? '').match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || [])];
  if (/price/i.test(name) && !tokens.some((token) => /Price\}|^\{price\}$/.test(token))) {
    tokens.push(...(name === 'priceTemplate' ? ['{price}'] : ['{individualPrice}', '{familyPrice}', '{seniorPrice}', '{athletePrice}']));
  }
  if (tokens.length) {
    notes.push(`Keep ${tokens.join(', ')} where the live value should appear.`);
    if (tokens.some((token) => /Price\}|^\{price\}$/.test(token))) notes.push('Price tokens use the amounts in Starting prices.');
    if (tokens.includes('{email}')) notes.push('{email} uses the public contact email.');
    if (tokens.includes('{index}') || tokens.includes('{total}')) notes.push('{index} is the current photograph or slide; {total} is the total number.');
    if (tokens.includes('{count}')) notes.push('{count} is the number of matching photographs.');
    if (tokens.includes('{limit}')) notes.push('{limit} is the field’s character limit.');
    if (tokens.includes('{description}')) notes.push('{description} is the photograph’s alt text.');
    if (tokens.includes('{rating}')) notes.push('{rating} is the supplied review rating.');
  }
  return notes.join(' ') || undefined;
}

function pageFieldsetFor(name) {
  if (/^(closing|invitation)/.test(name)) return 'closing';
  if (/^experience/.test(name) || name === 'steps') return 'process';
  if (/^featured/.test(name)) return 'featured';
  if (/^faq/.test(name) || name === 'questions') return 'faq';
  if (name === 'sessionDetails' || name === 'detailsHeadline') return 'details';
  if (/Link(?:Label|Href|NewTab)?$/.test(name) || /^(link|email)(Label|Href|NewTab)$/.test(name)) return 'links';
  if (['headline', 'intro', 'eyebrow', 'locationLabel', 'location', 'personName', 'signature'].includes(name)) return 'intro';
  return 'sections';
}

function objectFields(value, path) {
  const fields = Object.entries(value).map(([key, item]) => buildField(key, item, [...path, key]));
  if (path[0] !== 'copy' || path.length !== 2 || path[1] === 'meta') return {fields};
  const grouped = fields.map((field) => ({...field, fieldset: pageFieldsetFor(field.name)}));
  return {fields: grouped, fieldsets: pageFieldsets.filter((fieldset) => grouped.some((field) => field.fieldset === fieldset.name))};
}

function photoField(name, title, {required = true, description} = {}) {
  return defineField({name, title, type: 'string', components: {input: PhotoKeyInput}, description,
    ...(required ? {validation: (Rule) => Rule.required()} : {})});
}

function buildField(name, value, path) {
  const title = titleFor(name, path);
  const description = descriptionFor(name, value, path);
  if (name === 'rating') return defineField({name, title, type: 'number', description: 'Leave blank when no rating was supplied. A written recommendation is not automatically a five-star rating.', options: {list: [1, 2, 3, 4, 5].map((rating) => ({title: `${rating} out of 5`, value: rating}))}, validation: (Rule) => Rule.integer().min(1).max(5)});
  if (name === 'photo') return photoField(name, 'Photograph beside this session');
  if (name === 'photoKey') return photoField(name, title, {required: false, description});
  if (name === 'priceKey') return defineField({name, title, type: 'string', description: 'Choose the amount from Starting prices. Choose Custom quote, or clear this field, to use the custom-quote wording.', options: {layout: 'dropdown', list: priceChoices}, validation: (Rule) => Rule.custom((selected) => selected == null || priceChoices.some((choice) => choice.value === selected) || 'Choose one of the listed starting prices.')});
  if (name === 'type') return defineField({name, title, type: 'string', description: 'Choose the inquiry-form session to preselect when a session link uses its default destination. An explicit link destination below takes precedence.', options: {layout: 'dropdown', list: sessionChoices}, validation: (Rule) => Rule.custom((selected) => selected == null || sessionChoices.some((choice) => choice.value === selected) || 'Choose one of the listed inquiry sessions.')});
  if (isHref(name)) return defineField({name, title, type: 'string', description: hrefHelp, validation: (Rule) => Rule.custom(validateHref)});
  if (typeof value === 'boolean') return defineField({name, title, type: 'boolean', initialValue: false, description: /newTab$/i.test(name) ? 'Turn on only when you want this destination to open separately. Visitors also receive a new-tab announcement.' : description});
  if (typeof value === 'number') return defineField({name, title, type: 'number', description});
  if (Array.isArray(value)) {
    if (name === 'inclusions') return defineField({name, title, type: 'array', description,
      of: [{type: 'text', title: 'Confirmed inclusion', rows: 2}], validation: (Rule) => Rule.max(12)});
    const objects = value.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (objects.length) {
      const sample = Object.assign({}, ...objects);
      const fields = Object.entries(sample).map(([key, item]) => buildField(key, item, [...path, 'item', key]));
      const previewTitle = ['headline', 'title', 'name', 'question', 'label'].find((key) => key in sample);
      const itemTitle = name === 'testimonials' ? 'Client review' : ['questions', 'faqItems'].includes(name) ? 'Question' : ['sessions', 'sessionDetails'].includes(name) ? 'Session' : name === 'steps' ? 'Process step' : 'href' in sample ? 'Link' : 'Section';
      const arrayDescription = name === 'testimonials' ? 'Drag to reorder. Preserve clients’ words and attribution. Publish when changes are ready.'
        : path[0] === 'navigation' ? 'Add links or drag to change their order. Menu links do not create or delete website pages.'
          : name === 'sections' ? 'The first three entries fill the existing page layout slots; their order here is not always their visual order (the family page shows the second slot before the first). Additional entries appear below those sections in list order. This list changes section content, not the overall page layout.' : 'Add entries or drag to change their order.';
      return defineField({name, title, type: 'array', description: arrayDescription,
        of: [{type: 'object', name: memberName(path), title: itemTitle, fields, options: objectOptions,
          ...(['faqItems', 'steps', 'sessionDetails'].includes(name) ? {initialValue: () => ({id: `${name}_${Math.random().toString(36).slice(2, 11)}`})} : {}),
          preview: previewTitle ? {select: {title: previewTitle, ...('href' in sample ? {subtitle: 'href'} : {})}, prepare: ({title: previewLabel, subtitle}) => ({title: previewLabel || `New ${itemTitle.toLowerCase()}`, subtitle})} : undefined}],
      });
    }
    return defineField({name, title, type: 'array', of: [{type: 'text', title: 'Paragraph', rows: 5, description: inlineLinkHelp}], description: `Each entry is a separate paragraph. Drag to change their order. ${description || inlineLinkHelp}`});
  }
  if (value && typeof value === 'object') return defineField({name, title, type: 'object', options: objectOptions, ...objectFields(value, path)});
  const technical = ['route', 'id'].includes(name);
  const multiline = !technical && (String(value || '').length > 100 || /copy|intro|paragraph|text|quote|answer|note|description|sidebar/i.test(name));
  return defineField({name, title, type: multiline ? 'text' : 'string', description, ...(multiline ? {rows: name === 'quote' ? 6 : 4} : {}), readOnly: technical, hidden: technical,
    ...(name === 'quote' || name === 'name' || name === 'headline' ? {validation: (Rule) => Rule.required()} : {})});
}

const copyFields = pageOrder.filter((name) => Object.hasOwn(defaults.copy, name)).map((name) => ({...buildField(name, defaults.copy[name], ['copy', name]), title: pageTitles[name], group: name}));
const galleryCategories = [
  {title: 'Individuals & families', value: 'families'},
  {title: 'Seniors & graduates', value: 'seniors'},
  {title: 'Athletes & teams', value: 'athletes'},
];
const validateGallerySlugs = (items) => {
  if (!Array.isArray(items)) return true;
  const slugs = items.map((item) => item?.slug).filter(Boolean);
  return new Set(slugs).size === slugs.length || 'Each featured gallery needs a different URL name.';
};
const uniquePhotoKeys = (photos, context) => {
  if (!Array.isArray(photos)) return true;
  const keys = photos.map((photo) => photo.key);
  if (new Set(keys).size !== keys.length) return 'Each photograph must have a unique reference key.';
  const referenced = [
    ...(context.document?.portfolioOrder || []),
    ...(context.document?.featuredPhotos || []).flatMap((frame) => [frame.main, frame.left, frame.right]),
    ...(context.document?.copy?.home?.services || []).map((service) => service.photoKey),
    ...Object.values(context.document?.copy?.placements || {}).map((position) => position?.photoKey),
    ...(context.document?.featuredSessions || []).filter((gallery) => gallery.enabled).flatMap((gallery) => [gallery.coverKey, ...(gallery.photoKeys || [])]),
  ];
  return referenced.every((key) => !key || keys.includes(key)) || 'A photograph used in the homepage, a page position, the portfolio, or an enabled featured gallery has been removed. Update those selections first.';
};

export const photographySite = defineType({
  name: CONTENT_TYPE,
  title: 'Walt Dublin Photography website',
  type: 'document',
  groups: [
    {name: 'content', title: 'Pages & reviews', default: true}, {name: 'photos', title: 'Photograph library'},
    {name: 'hero', title: 'Homepage hero photos'}, {name: 'portfolio', title: 'Portfolio order'},
    {name: 'featured', title: 'Featured galleries'},
    {name: 'prices', title: 'Starting prices'}, {name: 'navigation', title: 'Menus & footer'},
    {name: 'interfaceCopy', title: 'Controls & messages'}, {name: 'settings', title: 'Contact & links'},
  ],
  fields: [
    defineField({name: 'copy', title: 'Website wording', type: 'object', group: 'content', options: {collapsible: false},
      description: 'Choose a page tab, then open Introduction, Page sections, Links, or Closing invitation. Body paragraphs can include optional [words](/contact) links. Changes remain drafts until you click Publish.',
      groups: pageOrder.filter((name) => Object.hasOwn(defaults.copy, name)).map((name) => ({name, title: pageTitles[name], default: name === 'home'})), fields: copyFields}),
    defineField({...buildField('navigation', defaults.navigation, ['navigation']), group: 'navigation', options: {collapsible: false},
      description: 'Edit menu wording, destinations, ordering, and the footer details. The footer paragraph itself remains in Pages & reviews → Footer.'}),
    defineField({...buildField('interfaceCopy', defaults.interfaceCopy, ['interfaceCopy']), group: 'interfaceCopy', options: {collapsible: false},
      description: 'Edit controls, screen-reader labels, form feedback, and error messages. Keep the named tokens in place where live values belong. Blank required messages retain safe built-in wording.'}),
    defineField({name: 'photos', title: 'Photographs', type: 'array', group: 'photos',
      description: 'Replace or upload photographs here, edit the description, and set the crop/hotspot. Use Homepage hero photos, Portfolio order, Featured galleries, Page photographs, or Home → Session links to place new images.',
      of: [{type: 'object', name: 'photographyPhoto', title: 'Photograph',
        initialValue: () => ({key: `photo_${Math.random().toString(36).slice(2, 11)}`, category: 'families'}),
        fields: [
          defineField({name: 'key', title: 'Reference key', type: 'string', hidden: true, readOnly: true, validation: (Rule) => Rule.required()}),
          defineField({name: 'title', title: 'Photograph name', type: 'string', description: 'A short name to help you find this image in selectors.', validation: (Rule) => Rule.required()}),
          defineField({name: 'image', title: 'Image', type: 'image', options: {hotspot: true}, validation: (Rule) => Rule.required()}),
          defineField({name: 'alt', title: 'Image description (alt text)', type: 'text', rows: 3, description: 'Describe what is visible for someone using a screen reader. Do not add unsupported relationships or locations.', validation: (Rule) => Rule.required().max(500)}),
          defineField({name: 'category', title: 'Collection', type: 'string', options: {list: [
            {title: 'Individuals & families', value: 'families'}, {title: 'Seniors & graduates', value: 'seniors'},
            {title: 'Athletes & teams', value: 'athletes'}, {title: 'Couples', value: 'couples'}, {title: 'Events', value: 'events'}, {title: 'About Walt', value: 'about'},
          ]}, validation: (Rule) => Rule.required()}),
        ], preview: {select: {title: 'title', subtitle: 'alt', media: 'image'}},
      }], validation: (Rule) => Rule.required().min(1).custom(uniquePhotoKeys),
    }),
    defineField({name: 'featuredPhotos', title: 'Homepage hero photos', type: 'array', group: 'hero',
      description: 'These are the large full-width photographs at the top of the homepage. The headline and buttons sit over the lower-left corner, so choose wide landscape photographs with the people in the upper or right part of the frame. The homepage rotates through them in this order, one every five seconds. Drag to reorder.',
      of: [{type: 'object', name: 'heroFrame', title: 'Hero photo', fields: [
        photoField('main', 'Hero photograph'),
        photoField('left', 'Left supporting portrait (no longer shown)', {required: false, description: 'Used by the previous three-image layout. Not displayed on the current homepage; you can leave it blank.'}),
        photoField('right', 'Right supporting portrait (no longer shown)', {required: false, description: 'Used by the previous three-image layout. Not displayed on the current homepage; you can leave it blank.'}),
      ], preview: {select: {main: 'main'}, prepare: ({main}) => ({title: main ? `Hero photo: ${main}` : 'Choose a hero photograph'})}}],
      validation: (Rule) => Rule.required().min(1).max(12),
    }),
    defineField({name: 'portfolioOrder', title: 'Portfolio photographs in order', type: 'array', group: 'portfolio',
      description: 'Choose photographs from the library and drag to reorder. Categories automatically determine the collection filters.',
      of: [{type: 'string', title: 'Photograph', components: {input: PhotoKeyInput}}], validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({name: 'featuredSessions', title: 'Featured galleries', type: 'array', group: 'featured',
      description: 'Choose a cover and an ordered selection of photographs for each gallery. These appear on /featured and relevant service pages when enabled. Use a collection for photographs from different shoots; only describe a single session when that is accurate. Changes remain drafts until Publish.',
      of: [{type: 'object', name: 'featuredPhotographyGallery', title: 'Featured gallery',
        initialValue: () => ({id: `gallery_${Math.random().toString(36).slice(2, 11)}`, type: 'collection', enabled: false, location: ''}),
        fieldsets: [
          {name: 'intro', title: 'Gallery description & visibility', options: {collapsible: true, collapsed: false}},
          {name: 'photos', title: 'Gallery photographs', options: {collapsible: true, collapsed: false}},
          {name: 'link', title: 'Inquiry link', options: {collapsible: true, collapsed: true}},
        ],
        fields: [
          defineField({name: 'id', title: 'Reference key', type: 'string', hidden: true, readOnly: true}),
          defineField({name: 'enabled', title: 'Show this gallery on the website', type: 'boolean', fieldset: 'intro', initialValue: false,
            description: 'Turn on when the photographs and description are ready. Publishing with this off keeps the gallery out of the public site.'}),
          defineField({name: 'title', title: 'Gallery title', type: 'string', fieldset: 'intro',
            description: 'Use a clear title. Do not imply a date, location, or single client session unless you have confirmed it.', validation: (Rule) => Rule.required().max(160)}),
          defineField({name: 'slug', title: 'Gallery URL name', type: 'string', fieldset: 'intro',
            description: 'Lowercase words separated by hyphens, such as selected-family-portraits. This follows /featured/ in the gallery address. Changing a published URL can break links already shared.',
            validation: (Rule) => Rule.required().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {name: 'lowercase words separated by hyphens'})}),
          defineField({name: 'type', title: 'What this gallery represents', type: 'string', fieldset: 'intro', initialValue: 'collection',
            description: 'A collection may contain different people and shoots. Choose a single session only when every photograph belongs to that session; the description should remain factual.',
            options: {list: [{title: 'Selected photographs from different shoots', value: 'collection'}, {title: 'One confirmed session', value: 'session'}]}, validation: (Rule) => Rule.required()}),
          defineField({name: 'category', title: 'Related portrait service', type: 'string', fieldset: 'intro', options: {list: galleryCategories},
            description: 'Controls the related service page and which service page displays this gallery.', validation: (Rule) => Rule.required()}),
          defineField({name: 'description', title: 'Gallery introduction', type: 'text', rows: 4, fieldset: 'intro',
            description: `Write in your own first-person voice. Explain what the visitor is looking at without inventing client stories, dates, or locations. ${inlineLinkHelp} Inline links work on the gallery page. On a linked gallery card, their wording is shown without separate clickable destinations.`}),
          defineField({name: 'location', title: 'Confirmed location (optional)', type: 'string', fieldset: 'intro',
            description: 'Leave blank unless you know the gallery was photographed at this location. Do not label earlier work as Charlotte work just because Charlotte is your current service area.'}),
          defineField({...photoField('coverKey', 'Gallery cover photograph'), fieldset: 'photos',
            description: 'Choose from the photograph library. Include the cover in the photograph selection below.'}),
          defineField({name: 'photoKeys', title: 'Photographs in order', type: 'array', fieldset: 'photos',
            description: 'Choose photographs from the library and drag to change their order. Each image should appear once; avoid alternative uploads of the same photograph.',
            of: [{type: 'string', title: 'Photograph', components: {input: PhotoKeyInput}}],
            validation: (Rule) => Rule.required().min(1).unique().custom((items, context) => !context.parent?.coverKey || !Array.isArray(items) || items.includes(context.parent.coverKey) || 'Include the cover photograph in this gallery selection.')}),
          defineField({...buildField('inquiryLink', defaults.copy.featured.inquiryLink, ['featuredSessions', 'inquiryLink']), fieldset: 'link',
            description: 'Optional gallery-specific inquiry wording and destination. Leave the whole object unset to use the default inquiry link in Pages & reviews → Featured galleries, followed by the related service inquiry link if needed.'}),
        ],
        preview: {select: {title: 'title', category: 'category', enabled: 'enabled'}, prepare: ({title, category, enabled}) => ({title: title || 'New featured gallery', subtitle: `${enabled ? 'Shown' : 'Hidden'} · ${galleryCategories.find((item) => item.value === category)?.title || 'Choose a service'}`})},
      }], validation: (Rule) => Rule.custom(validateGallerySlugs),
    }),
    defineField({name: 'prices', title: 'Starting prices (USD)', type: 'object', group: 'prices', options: {collapsible: false},
      description: 'These amounts update the repeated starting prices across the website. Team photography remains individually quoted.',
      fields: [['individual', 'Individual portraits'], ['family', 'Family portraits'], ['senior', 'Seniors & graduates'], ['athlete', 'Individual athletes']].map(([name, title]) => defineField({name, title, type: 'number', validation: (Rule) => Rule.required().min(0).max(250000)})),
    }),
    defineField({name: 'settings', title: 'Contact, business details & booking links', type: 'object', group: 'settings', options: {collapsible: false},
      fieldsets: [
        {name: 'business', title: 'Business details', options: {collapsible: true, collapsed: false}},
        {name: 'booking', title: 'Default inquiry link', options: {collapsible: true, collapsed: false}},
        {name: 'contact', title: 'Email & social profiles', options: {collapsible: true, collapsed: false}},
      ], fields: [
      defineField({name: 'brandName', title: 'Business name', type: 'string', fieldset: 'business', description: 'Used wherever the website displays the business name. The signature image remains unchanged.', validation: (Rule) => Rule.required().max(160)}),
      defineField({name: 'businessDescription', title: 'Business description', type: 'text', rows: 3, fieldset: 'business', description: 'Describe the photography services in plain text for the website’s business information.', validation: (Rule) => Rule.max(1000)}),
      defineField({name: 'areaServed', title: 'Areas served', type: 'array', fieldset: 'business', description: 'Add one place or service area per entry. This updates the website’s business information, not page-specific location wording.', of: [{type: 'string', title: 'Service area'}]}),
      defineField({name: 'bookingLabel', title: 'Main inquiry button wording', type: 'string', fieldset: 'booking', description: 'Used by the main inquiry button and primary inquiry or closing links whose labels are blank. Ordinary menu and text links keep their own wording.', validation: (Rule) => Rule.required().max(60)}),
      defineField({...buildField('bookingHref', defaults.settings.bookingHref, ['settings', 'bookingHref']), fieldset: 'booking'}),
      defineField({...buildField('bookingNewTab', defaults.settings.bookingNewTab, ['settings', 'bookingNewTab']), fieldset: 'booking'}),
      defineField({name: 'email', title: 'Public contact email', type: 'string', fieldset: 'contact', description: 'Updates visible email, email icons, and {email} tokens. Inquiry delivery is configured separately on the server.', validation: (Rule) => Rule.required().email()}),
      defineField({name: 'socialLinks', title: 'Social profile links', type: 'object', fieldset: 'contact', fields: [
        defineField({name: 'email', title: 'Email icon (generated from contact email)', type: 'string', hidden: true, readOnly: true}),
        defineField({name: 'facebook', title: 'Facebook profile URL', type: 'url', description: 'Leave blank to hide the Facebook icon.', validation: (Rule) => Rule.uri({scheme: ['https', 'http']})}),
        defineField({name: 'instagram', title: 'Instagram profile URL', type: 'url', description: 'Leave blank to hide the Instagram icon.', validation: (Rule) => Rule.uri({scheme: ['https', 'http']})}),
      ]}),
    ]}),
  ],
  preview: {prepare: () => ({title: 'Walt Dublin Photography', subtitle: 'Pages, images, prices, reviews, and contact details'})},
});
