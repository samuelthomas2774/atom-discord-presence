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

    activate(state) {
        // Events subscribed to in Atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'atom-discord-presence:connect': () => this.tryConnect(),
            'atom-discord-presence:update': () => this.client.sendActivity(),
            'atom-discord-presence:disconnect': () => this.client.destroy(),
            'atom-discord-presence:reset-timestamp': () => this.activity.resetStartTimestamp()
        }));

        this.client = new Client();
        this.activity = new Activity();

        // Set client state here
        this.subscriptions.add(atom.project.onDidChangePaths(this.setProjectPaths = projectPaths => {
            this.activity.setProjectName(projectPaths[0] ? path.basename(projectPaths[0]) : null);
        }));
        this.setProjectPaths(atom.project.getPaths());

        this.subscriptions.add(atom.workspace.observeActiveTextEditor(editor => {
            if (!editor) return this.activity.setFileName(undefined);
            this.activity.setFileName(editor.getTitle());
        }));

        // Connect to Discord and start sending activity
        this.tryConnect();

        this.subscriptions.add(this.client.emitter.on('connection-error', async event => {
            // Try to reconnect twice, if this fails show a warning
            let i;
            for (i = 0; i < 2; i++) {
                try {
                    await this.client.connect();
                    this.client.sendActivity();

                    return;
                } catch (err) {
                    // Either try again or show a warning
                }
            }

            const notification = atom.notifications.addWarning(`Connection to Discord failed. Tried to reconnect ${i} time${i === 1 ? '' : 's'}.`, {
                detail: event,
                dismissable: true,
                buttons: [{
                    text: 'Retry',
                    onDidClick: () => {
                        notification.dismiss();
                        this.tryConnect();
                    }
                }]
            });
        }));

        this.subscriptions.add(this.activity.onDidActivityUpdate(() => {
            this.client.sendActivity();
        }));
    },

    async tryConnect() {
        try {
            await this.client.connect();

            this.client.sendActivity();
        } catch (err) {
            console.error('Failed to connect to Discord:', err);

            if (this.behaviour.showConnectionStatusNotifications) {
                const notification = atom.notifications.addWarning('Failed to connect to Discord.', {
                    detail: err,
                    dismissable: true,
                    buttons: [{
                        text: 'Retry',
                        onDidClick: () => {
                            notification.dismiss();
                            this.tryConnect();
                        }
                    }]
                });
            }

            throw err;
        }
    },

    consumeStatusBar(statusBar) {
        this.statusBarView = new StatusBarView();
        this.statusBarTile = statusBar.addRightTile({ item: this.statusBarView.getElement(), priority: 100 });
    },

    async consumeTeletype(teletypeService) {
        this.teletypeService = teletypeService;
        const teletype = this.teletype = teletypeService.teletypePackage;

        const manager = await teletype.getPortalBindingManager();

        this.subscriptions.add(manager.onDidChange(async () => {
            const hostPortalBinding = await manager.getHostPortalBinding();

            this.activity.setJoinSecret(hostPortalBinding && hostPortalBinding.uri);
        }));
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
                showConnectionStatusNotifications: {
                    title: 'Show connection status notifications',
                    description: 'A notification will be shown if Atom Discord Presence fails to connect to Discord.',
                    type: 'boolean',
                    default: true
                },

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
                },

                sendTeletypeToken: {
                    title: 'Send Teletype token',
                    description: 'Sends your Teletype token to Discord to allow anyone to join your workspace. Requires Teletype to be installed and to be enabled for the specific editor instance.',
                    type: 'boolean',
                    default: true
                }
            },

            order: 3
        }
    }

};
