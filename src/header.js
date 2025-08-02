import content from './content/header.json';

export function header() {
    let logo = document.createElement("span");
    logo.textContent = content.logo;

    let title = document.createElement('h1');
    title.textContent = content.title;

    let subtitle = document.createElement('p');
    subtitle.textContent = content.subtitle;

    let contact = document.createElement("h2");
    contact.textContent = content.contact.title;

    let profile_list = document.createElement("ul");

    document.querySelector("#header").append(logo, title, subtitle, contact);

    content.contact.profiles.forEach(profile => {
        let list_item = document.createElement("li");
        let link = document.createElement("a");
        link.textContent = profile.title;
        link.href = profile.link;
        list_item.append(link);
        profile_list.append(list_item);
    });
    
    document.querySelector("#header").append(profile_list);
}
