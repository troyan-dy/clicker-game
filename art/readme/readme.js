// One page, two languages: ?lang=ru or ?lang=en picks the text of every element that has both.
const lang = new URLSearchParams(location.search).get('lang') === 'ru' ? 'ru' : 'en';
document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-en]')) el.innerHTML = el.dataset[lang];
