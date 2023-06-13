const API_BASE_URL = 'https://wordsapiv1.p.rapidapi.com'
const API_KEY = `22e0325feemshced4bcc1ee7fdf7p1f5b15jsn4420e54616f1`

class NoDefinitionFoundError extends Error {
	constructor() {
		super(`Sorry, no dictionary results for that word.`)
	}
}
class NoWordsFoundError extends Error {
	constructor() {
		super(`Sorry, no valid words were found.`)
	}
}

// https://codepen.io/noahblon/pen/yJpXka
const FOCUSABLE_ELEMENTS =
	'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]'

const ERRORS = {
	NO_DEFINITION_FOUND: 'NoDefinitionFoundError',
	NO_WORDS_FOUND: 'NoWordsFoundError'
}

const SORT = {
	SCORE: 'score',
	LENGTH: 'length'
}

const SCRABBLE_VALUES = {
	a: 1,
	b: 3,
	c: 3,
	d: 2,
	e: 1,
	f: 4,
	g: 2,
	h: 4,
	i: 1,
	j: 8,
	k: 5,
	l: 1,
	m: 3,
	n: 1,
	o: 1,
	p: 3,
	q: 10,
	r: 1,
	s: 1,
	t: 1,
	u: 1,
	v: 4,
	w: 4,
	x: 8,
	y: 4,
	z: 10
}

const STORE = {
	sort: SORT.SCORE,
	loadingWords: false,
	loadingDefinition: false,
	words: []
}

function createLengthWordList(words) {
	return words.reduce((acc, curr) => {
		if (!acc[curr.length]) acc[curr.length] = []
		acc[curr.length].push({ word: curr, score: getWordScore(curr) })
		return acc
	}, {})
}

function getWordScore(word) {
	return word.split('').reduce((acc, curr) => {
		return (acc += SCRABBLE_VALUES[curr])
	}, 0)
}

function createScoreWordList(words) {
	let wordScores = words.map(word => {
		return { word, score: getWordScore(word) }
	})

	return wordScores.sort((a, b) => (a.score > b.score ? -1 : 1))
}

function generateScoreResultsHTML(words) {
	let wordListWithScores = createScoreWordList(words)

	return wordListWithScores.map(wordAndScore => {
		return `<button data-word="${wordAndScore.word}"><span class="word">${wordAndScore.word}</span> <p class="score flex items-center">${wordAndScore.score} <span class="label ml-2">score</p></button>`
	})
}

function generateLengthResultsHTML(words) {
	let wordList = createLengthWordList(words)
	let output = ``
	Object.keys(wordList)
		.sort()
		.reverse()
		.forEach(count => {
			output += `<h3 class="word-length mt-4 inline-block px-3 py-1 bg-gray-900 text-white rounded">${count}</h3>`

			wordList[count].forEach(wordScore => {
				output += `<button data-word="${wordScore.word}"><span class="word">${wordScore.word}</span> <p class="score flex items-center">${wordScore.score} <span class="label ml-2">score</p></button>`
			})
		})
	return output
}

function showAndUpdateResults() {
	$('#results').show()

	let output =
		STORE.sort === SORT.SCORE
			? generateScoreResultsHTML(STORE.words)
			: generateLengthResultsHTML(STORE.words)

	$('#results-list').html(output)
}

function updateLoading() {
	STORE.loadingWords
		? $('#results-loader').show()
		: $('#results-loader').hide()

	STORE.loadingDefinition
		? $('#definition-loader').show()
		: $('#definition-loader').hide()
}

function generateDictionaryDefinitionHTML(word, results) {
	let output = `<h2>${word}</h2>`
	output += `<ul>`
	output += results
		.map((result, index) => {
			return `<li class="definition-${index} mt-4 flex items-baseline font-light leading-relaxed"><span class="label mr-2">${result.partOfSpeech}</span> ${result.definition}</li>`
		})
		.join('')
	output += `</ul>`
	output += `<a href="https://www.wordnik.com/words/${word}" target="_blank" class="inline-block mt-6">More info at Wordnik</a>`

	return output
}

function loadDictionaryDefinition(word) {
	const URL = `${API_BASE_URL}/words/${word}`

	const OPTIONS = {
		headers: new Headers({
			'X-RapidAPI-Key': API_KEY,
			'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
		})
	}

	$('main')
		.find(FOCUSABLE_ELEMENTS)
		.attr('tabindex', '-1')
	$('#modal-body').empty()
	$('#dictionary-modal').show()
	STORE.loadingDefinition = true
	updateLoading()

	fetch(URL, OPTIONS)
		.then(res => {
			if (res.ok) {
				return res.json()
			} else if (res.status === 404) {
				throw new NoDefinitionFoundError()
			}

			throw new Error(res.statusText)
		})
		.then(res => {
			if (!res.results) {
				throw new NoDefinitionFoundError()
			}

			const output = generateDictionaryDefinitionHTML(word, res.results)
			$('#modal-body').html(output)
			$('#modal')
				.find(FOCUSABLE_ELEMENTS)
				.focus()
		})
		.catch(e => {
			let output = [
				`<h2>Error</h2>`,
				`<p class="error font-light mt-4">${e.message}</p>`
			]

			if (e instanceof NoDefinitionFoundError) {
				output.push(
					`<a href="https://www.wordnik.com/words/${word}" target="_blank" class="inline-block mt-6">Look for definition on Wordnik</a>`
				)
			}

			$('#modal-body').html(output)
		})
		.finally(() => {
			STORE.loadingDefinition = false
			updateLoading()
		})
}

function loadWordResults(letters) {
	fetch(`https://scrabble.now.sh/api?letters=${letters}`)
		.then(res => {
			if (res.ok) {
				return res.json()
			}

			throw new Error(res.statusText)
		})
		.then(res => {
			if (!res.length) throw new NoWordsFoundError()

			STORE.words = res
			showAndUpdateResults()
		})
		.catch(e => {
			$('#results-error p').text(e.message)
			$('#results-error').show()
		})
		.finally(() => {
			STORE.loadingWords = false
			updateLoading()
		})
}

function handleSubmit() {
	$('#query').on('submit', e => {
		e.preventDefault()

		$('#results').hide()
		$('#results-list').empty()
		$('#results-error').hide()

		STORE.loadingWords = true
		updateLoading()

		const letters = $('#letters')
			.val()
			.toLowerCase()

		loadWordResults(letters)
	})
}

function handleSortChange() {
	$('#sort').change(function() {
		const sort = $(this)
			.find('option:selected')
			.val()

		STORE.sort = sort
		showAndUpdateResults()
	})
}

function handleWordClick() {
	$('#results').on('click', '[data-word]', function() {
		const word = $(this).data('word')

		loadDictionaryDefinition(word)
	})
}

function handleModalDismiss() {
	$('#overlay').on('click', e => {
		$('#dictionary-modal').hide()
		restoreFocus()
	})

	$('button#close-modal').on('click', e => {
		$('#dictionary-modal').hide()
		restoreFocus()
	})

	$('body').on('keydown', e => {
		if (e.keyCode === 27) {
			$('#dictionary-modal').hide()
			restoreFocus()
		}
	})
}

function restoreFocus() {
	$(FOCUSABLE_ELEMENTS).removeAttr('tabindex')
	$('#letters').focus()
}

$(() => {
	handleSubmit()
	handleSortChange()
	handleWordClick()
	handleModalDismiss()
})
