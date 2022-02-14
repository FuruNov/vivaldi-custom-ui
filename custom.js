// Activate Tab On Hover
// https://forum.vivaldi.net/topic/50354/create-a-new-mod-mouseover-tab-select/4
// Activates tab on hover.

{
	function activateTab(e, tab) {
		if (
			!tab.parentNode.classList.contains('active') &&
			!e.shiftKey &&
			!e.ctrlKey
		) {
			tab.addEventListener('mouseleave', function () {
				clearTimeout(wait);
				tab.removeEventListener('mouseleave', tab);
			});
			wait = setTimeout(function () {
				if (tab.parentNode.parentNode.classList.contains('is-substack')) {
					const down = document.createEvent('MouseEvents');
					down.initEvent('mousedown', true, true);
					tab.dispatchEvent(down);
					const up = document.createEvent('MouseEvents');
					up.initEvent('mouseup', true, true);
					tab.dispatchEvent(up);
				} else {
					const id = Number(tab.parentNode.id.replace(/^\D+/g, ''));
					chrome.tabs.update(id, { active: true, highlighted: true });
				}
			}, delay);
		}
	}

	var wait;
	const delay = 450; //pick a time in milliseconds
	var appendChild = Element.prototype.appendChild;
	Element.prototype.appendChild = function () {
		if (
			arguments[0].tagName === 'DIV' &&
			arguments[0].classList.contains('tab-header')
		) {
			setTimeout(
				function () {
					var trigger = (event) => activateTab(event, arguments[0]);
					arguments[0].addEventListener('mouseenter', trigger);
				}.bind(this, arguments[0])
			);
		}
		return appendChild.apply(this, arguments);
	};
}

// Tab Scroll
// version 2021.9.0
// https://forum.vivaldi.net/topic/27856/tab-scroll
// Clicking on an active tab scrolls page to top, clicking it again returns to
// previous scroll position. Credits to tam710562 from Vivaldi Forum for coming
// up with the sessionStorage solution, which made this possible.
{
	(function () {
		function tabScrollExit(tab) {
			tab.removeEventListener('mousemove', tabScrollExit);
			tab.removeEventListener('click', tabScrollTrigger);
		}

		function tabScrollTrigger(tab) {
			chrome.scripting.executeScript({
				target: { tabId: Number(tab.parentNode.id.replace(/\D/g, '')) },
				function: tabScrollScript,
			});
			tabScrollExit(tab);
		}

		function tabScroll(e, tab) {
			if (
				tab.parentNode.classList.contains('active') &&
				e.which === 1 &&
				!e.shiftKey &&
				!e.ctrlKey &&
				!e.altKey &&
				!e.metaKey
			) {
				tab.addEventListener('mousemove', tabScrollExit(tab));
				tab.addEventListener('click', tabScrollTrigger(tab));
			}
		}

		const tabScrollScript = () => {
			let offset = window.pageYOffset;
			if (offset > 0) {
				window.sessionStorage.setItem('tabOffset', offset);
				window.scrollTo(0, 0);
			} else {
				window.scrollTo(0, window.sessionStorage.getItem('tabOffset') || 0);
			}
		};

		var appendChild = Element.prototype.appendChild;
		Element.prototype.appendChild = function () {
			if (
				arguments[0].tagName === 'DIV' &&
				arguments[0].classList.contains('tab-header')
			) {
				setTimeout(
					function () {
						const trigger = (event) => tabScroll(event, arguments[0]);
						arguments[0].addEventListener('mousedown', trigger);
					}.bind(this, arguments[0])
				);
			}
			return appendChild.apply(this, arguments);
		};
	})();
}

// Theme Interface plus
// version 2021.11.8
// https://forum.vivaldi.net/topic/68564/theme-interface-plus
// Adds functionality to toggle system themes, sort user themes alphabetically,
// move themes individually and expand the overview, to Vivaldi’s settings page.

{
	(function () {
		let toggle = (init) => {
			const css = document.getElementById('tipCSS');
			if (
				(systemDefault === 0 && init === 1) ||
				(systemDefault === 1 && init !== 1)
			) {
				if (!css) {
					vivaldi.prefs.get('vivaldi.themes.current', (current) => {
						vivaldi.prefs.get('vivaldi.themes.system', (sys) => {
							let index = sys.findIndex((x) => x.id === current);
							const hide = document.createElement('style');
							hide.setAttribute('type', 'text/css');
							hide.id = 'tipCSS';
							hide.innerText = `.ThemePreviews > div:nth-child(-n+${
								sys.length
							}):not(:nth-child(${index + 1})){display: none}`;
							document.getElementsByTagName('head')[0].appendChild(hide);
						});
					});
				}
				systemDefault = 0;
			} else {
				if (css) css.parentNode.removeChild(css);
				systemDefault = 1;
			}
		};

		let sort = () => {
			vivaldi.prefs.get('vivaldi.themes.user', (collection) => {
				collection.sort((a, b) => {
					return a.name.localeCompare(b.name);
				});
				vivaldi.prefs.set({ path: 'vivaldi.themes.user', value: collection });
			});
		};

		let move = (dir) => {
			vivaldi.prefs.get('vivaldi.themes.current', (current) => {
				vivaldi.prefs.get('vivaldi.themes.user', (collection) => {
					let index = collection.findIndex((x) => x.id === current);
					if (index > -1 && dir === 'right') {
						if (index === collection.length - 1) {
							collection.unshift(collection.splice(index, 1)[0]);
						} else {
							let fromI = collection[index];
							let toI = collection[index + 1];
							collection[index + 1] = fromI;
							collection[index] = toI;
						}
					} else if (index > -1 && dir !== 'right') {
						if (index === 0) {
							collection.push(collection.splice(index, 1)[0]);
						} else {
							let fromI = collection[index];
							let toI = collection[index - 1];
							collection[index - 1] = fromI;
							collection[index] = toI;
						}
					} else return;
					vivaldi.prefs.set({ path: 'vivaldi.themes.user', value: collection });
				});
			});
		};

		let expand = (opt) => {
			const view = document.querySelector('.TabbedView');
			if (opt === 1 || expansion === 0) {
				view.style.maxWidth = 'unset';
				expansion = 1;
			} else if (opt === 0) {
				view.style.maxWidth = '660px';
			} else {
				view.style.maxWidth = '660px';
				expansion = 0;
			}
		};

		let goUI = {
			buttons: [
				// text, title, function (translate strings)
				['Toggle', 'Toggle System Themes', toggle],
				['Sort', 'Sort Themes Alphabetically', sort],
				['\u{25C2}', 'Move Theme Left', move],
				['\u{25B8}', 'Move Theme Right', () => move('right')],
				['<b>\u{FF3B}\u{FF3D}</b>', 'Expand/Contract', expand],
			],
			load: () => {
				const footer = document.querySelector('.TabbedView-Footer');
				const link = document.querySelector('.TabbedView-Footer a');
				if (!footer.classList.contains('tipBtn')) {
					footer.classList.add('tipBtn');
					goUI.buttons.forEach((button) => {
						let b = document.createElement('div');
						b.classList.add('button-toolbar');
						b.innerHTML = `<button title="${button[1]}" type="button" class="ToolbarButton-Button button-textonly"><span class="button-title">${button[0]}</span></button>`;
						footer.insertBefore(b, link);
						b.addEventListener('click', button[2]);
					});
				}
				if (expansion === 1) expand(1);
			},
		};

		let mi5 = (mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (
						node.classList.contains('TabbedView-Content') &&
						document.querySelector('.ThemePreviews')
					) {
						goUI.load();
					} else {
						if (expansion === 1) expand(0);
					}
				});
			});
		};

		let systemDefault = 0; // set to »1« to display system themes by default
		let expansion = 0; // set to »1« for the maximum number of themes per row by default
		const settingsUrl =
			'chrome-extension://mpognobbkildjkofajifpdfhcoklimli/components/settings/settings.html?path=';
		toggle(1);
		chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
			if (changeInfo.url === `${settingsUrl}themes`) {
				goUI.load();
				const view = document.querySelector('.TabbedView');
				new MutationObserver(mi5).observe(view, { childList: true });
			}
		});
	})();
}

// [Mod] Extensions in left pane and auto hide address bar/show on hover
// {
// 	setTimeout(function wait() {
// 		const toolbarExtensions = document.querySelector('.toolbar-extensions');
// 		document.querySelector('.slim-scrollbar').append(toolbarExtensions);
// 	}, 300);
// }
