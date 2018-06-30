'use babel';

import { CompositeDisposable } from 'atom';
import path from 'path';

import StatusBarView from './status-bar-view';

import Client from './client';
import Activity from './activity';

const DISCORD_ID = '462396656206479370';

export default {

    DISCORD_ID,

    subscriptions: null,
    statusBarTile: null,

    async activate(state) {
        // Events subscribed to in Atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        this.client = new Client();
        this.activity = new Activity();

        // Set client state here
        this.subscriptions.add(atom.project.onDidChangePaths(projectPaths => {
            this.activity.setProjectName(path.basename(projectPaths[0]));
        }));
        this.activity.setProjectName(path.basename(atom.project.getPaths()[0]));

        this.subscriptions.add(atom.workspace.observeActiveTextEditor(editor => {
            if (!editor) return this.activity.setFileName(undefined);
            this.activity.setFileName(editor.getTitle());
        }));

        // Connect to Discord and start sending activity
        await this.client.connect();

        this.subscriptions.add(this.activity.observeActivityUpdate(() => {
            this.client.sendActivity();
        }));
    },

    consumeStatusBar(statusBar) {
        this.statusBarView = new StatusBarView();
        this.statusBarTile = statusBar.addRightTile({ item: this.statusBarView.getElement(), priority: 100 });
    },

    get translations() {
        return require('../i18n/' + atom.config.get('atom-discord-presence.i18n'));
    },

    getTranslation(key, args = {}) {
        let tr = this.translations[key];
        if (!tr) throw new Error(`Unknown string ${key}.`);

        for (let i in args) {
            tr = tr.replace(new RegExp(`%${i}%`, 'g'), args[i]);
        }

        return tr;
    },

    get privacy() {
        return atom.config.get('atom-discord-presence.privacy');
    },

    get behaviour() {
        return atom.config.get('atom-discord-presence.behaviour');
    },

    get updateTick() {
        return this.behaviour.updateTick;
    },

    deactivate() {
        this.subscriptions.dispose();
        this.statusBarTile.destroy();
        this.statusBarView.destroy();
        this.client.destroy();
    },

    serialize() {
        return {
            statusBarViewState: this.statusBarView.serialize()
        };
    },

    config: {
        behaviour: {
            title: 'Behaviour',
            description: '',
            type: 'object',
            properties: {
                sendSmallImage: {
                    title: 'Display small Atom logo',
                    description: '',
                    type: 'boolean',
                    default: true
                },

                sendLargeImage: {
                    title: 'Display large file type image',
                    description: '',
                    type: 'boolean',
                    default: true
                },

                preferType: {
                    title: 'Prefer file type',
                    description: 'Send file type as description instead of file name.',
                    type: 'boolean',
                    default: false
                },

                showFilenameOnLargeImage: {
                    title: 'Show file name on large image',
                    description: '',
                    type: 'boolean',
                    default: false
                },

                updateTick: {
                    title: 'Update tick',
                    description: 'Interval between state update (ms).',
                    type: 'number',
                    default: 15e3
                },

                alternativeIcon: {
                    title: 'Atom Icon',
                    description: 'Select icon for small icons.',
                    type: 'string',
                    enum: [
                        {
                            value: 'atom-original',
                            description: 'Original Atom Icon'
                        },

                        {
                            value: 'atom',
                            description: 'Atom Alternative Icon 1 (Monotone)'
                        },

                        {
                            value: 'atom-2',
                            description: 'Atom Alternative Icon 2 (Gradient)'
                        },

                        {
                            value: 'atom-3',
                            description: 'Atom Alternative Icon 3 (Polyhedron)'
                        },

                        {
                            value: 'atom-5',
                            description: 'Atom Alternative Icon 4 (Dark, Rhombus)'
                        }
                    ],
                    default: 'atom'
                },

                useRestIcon: {
                    title: 'Use rest icon',
                    description: 'Use rest icon for idle status.',
                    type: 'boolean',
                    default: false
                }
            },
            order: 1
        },

        i18n: {
            title: 'i18n',
            description: 'Select Language',
            type: 'string',
            default: 'en-US',
            enum: [
                {
                    value: 'nl-NL',
                    description: 'Dutch (Netherlands)'
                },

                {
                    value: 'en-US',
                    description: 'English (United States)'
                },

                {
                    value: 'fr-FR',
                    description: 'French (France)'
                },

                {
                    value: 'de-DE',
                    description: 'German (Germany)'
                },

                {
                    value: 'he-IL',
                    description: 'Hebrew (Israel)'
                },

                {
                    value: 'it-IT',
                    description: 'Italian (Italy)'
                },

                {
                    value: 'ko-KR',
                    description: 'Korean (Korea)'
                },

                {
                    value: 'no-NO',
                    description: 'Norwegian (Bokmal)'
                },

                {
                    value: 'pl-PL',
                    description: 'Polish (Poland)'
                },

                {
                    value: 'pt-BR',
                    description: 'Portuguese (Brazil)'
                },

                {
                    value: 'ro-RO',
                    description: 'Romanian (Romania)'
                },

                {
                    value: 'ru-RU',
                    description: 'Russian (Russia)'
                },

                {
                    value: 'es-ES',
                    description: 'Spanish (Spain)'
                }
            ],

            order: 2
        },

        privacy: {
            title: 'Privacy',
            description: 'Select things to integrate',
            type: 'object',
            properties: {
                sendLargeImage: {
                    title: 'Display large file type image',
                    description: '',
                    type: 'boolean',
                    default: true
                },

                sendFilename: {
                    title: 'Send file name',
                    description: 'Integrate file name.',
                    type: 'boolean',
                    default: true
                },

                sendProject: {
                    title: 'Send project name',
                    description: 'Integrate project name.',
                    type: 'boolean',
                    default: true
                },

                sendFileType: {
                    title: 'Send file type',
                    description: 'Integrate type of files.',
                    type: 'boolean',
                    default: true
                },

                sendElapsed: {
                    title: 'Send elapsed time',
                    description: 'Integrate elapsed time when you started coding.',
                    type: 'boolean',
                    default: true
                }
            },

            order: 3
        }
    }

};
