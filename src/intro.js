import content from './content/intro.json';

export function intro() {
    let title = document.createElement('h1');
    title.textContent = content.title;

    let headline = document.createElement('p');
    headline.textContent = content.headline;

    let summary = document.createElement('p');
    summary.textContent = content.summary;

    document.querySelector("#intro").append(title, headline, summary);
}
