/**
 * @module data/languages
 */

const languages = [
	{
		id: 'churchslavonic',
		code: 'cs',
		name: 'Церковнославянский'
	},
	{
		id: 'slavonic',
		code: 'sl',
		name: 'Русский'
	}
];

function langById(langId) {
	return languages.find(({id}) => id === langId);
}

function langByCode(langCode) {
	return languages.find(({code}) => code === langCode);
}

export {
	languages,
	langById,
	langByCode
};
