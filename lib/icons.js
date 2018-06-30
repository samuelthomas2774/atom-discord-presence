'use babel';

import AtomDiscordPresence from './atom-discord-presence';
import matched from '../data/matched.json';

const REGEX_REGEX = /^\/(.*)\/([mgiy]+)$/;
export const icons = new Map();

function test(filename) {
    if (typeof this.rawTest === 'string') return filename.endsWith(this.rawTest);

    if (this.rawTest.test) return this.rawTest.test(filename);

    return undefined;
}

for (let key in matched) {
    const match = key.match(REGEX_REGEX);
    const rawTest = match ? new RegExp(match[1], match[2]) : key;

    icons.set(matched[key].icon, Object.assign(matched[key], {
        key,
        rawTest,
        test
    }));
}

export function findIcon(filter) {
    for (let [key, icon] of icons.entries()) {
        if (filter(icon)) return icon;
    }
}

export function getIcon(filename) {
    return (filename && findIcon(icon => test.call(icon, filename))) || {
        icon: AtomDiscordPresence.behaviour.useRestIcon ? 'rest' : 'text',
        text: AtomDiscordPresence.behaviour.useRestIcon
            ? AtomDiscordPresence.getTranslation('developer-idle')
            : AtomDiscordPresence.getTranslation('editing-idle')
    };
}

export default {
    icons,
    findIcon,
    getIcon
};
