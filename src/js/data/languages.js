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

export {
	languages,
	langById
};
