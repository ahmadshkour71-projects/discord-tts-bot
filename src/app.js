const path = require('path');
const { ConfigProvider } = require('@greencoast/discord.js-extended');
const RedisDataProvider = require('@greencoast/discord.js-extended/dist/providers/RedisDataProvider').default;
const LevelDataProvider = require('@greencoast/discord.js-extended/dist/providers/LevelDataProvider').default;
const TTSClient = require('./classes/extensions/TTSClient');

const SUPPORTED_PROVIDERS = ['level', 'redis'];

const config = new ConfigProvider({
  configPath: path.join(__dirname, '../config/settings.json'),
  env: process.env,
  default: {
    PREFIX: '$',
    OWNER_ID: null,
    OWNER_REPORTING: false,
    PRESENCE_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 Minutes
    DISCONNECT_TIMEOUT: 5 * 60 * 1000, // 5 Minutes,
    TESTING_GUILD_ID: null,
    PROVIDER_TYPE: 'level',
    REDIS_URL: null
  },
  types: {
    TOKEN: 'string',
    PREFIX: 'string',
    OWNER_ID: ['string', 'null'],
    OWNER_REPORTING: 'boolean',
    PRESENCE_REFRESH_INTERVAL: ['number', 'null'],
    DISCONNECT_TIMEOUT: ['number', 'null'],
    TESTING_GUILD_ID: ['string', 'null'],
    PROVIDER_TYPE: 'string',
    REDIS_URL: ['string', 'null']
  },
  customValidators: {
    PROVIDER_TYPE: (value) => {
      if (!SUPPORTED_PROVIDERS.includes(value)) {
        throw new TypeError(`${value} is not a valid data provider, it must be one of ${SUPPORTED_PROVIDERS.join(', ')}`);
      }
    }
  }
});

const client = new TTSClient({
  config,
  debug: process.argv.includes('--debug'),
  errorOwnerReporting: config.get('OWNER_REPORTING'),
  owner: config.get('OWNER_ID'),
  prefix: config.get('PREFIX'),
  presence: {
    refreshInterval: config.get('PRESENCE_REFRESH_INTERVAL'),
    templates: [
      '{num_guilds} servers!',
      '{prefix}help for help.',
      '{num_members} users!',
      'up for {uptime}.'
    ]
  },
  testingGuildID: config.get('TESTING_GUILD_ID'),
  intents: ['GUILD_MESSAGES', 'GUILD_MEMBERS', 'GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES']
});

client
  .registerDefaultEvents()
  .registerExtraDefaultEvents();

client.registry
  .registerGroups([
    ['all-tts', 'All TTS Commands'],
    ['config', 'Configuration Commands'],
    ['google-tts', 'Google TTS Commands'],
    ['other-tts', 'Other TTS Commands'],
    ['misc', 'Miscellaneous Commands']
  ])
  .registerCommandsIn(path.join(__dirname, './commands'));

const createProvider = (type) => {
  switch (type) {
    case 'level':
      return new LevelDataProvider(client, path.join(__dirname, '../data'));
    case 'redis':
      return new RedisDataProvider(client, { url: config.get('REDIS_URL') });
    default:
      throw new TypeError(`${type} is not a valid data provider, it must be one of ${SUPPORTED_PROVIDERS.join(', ')}`);
  }
};

client.on('ready', async() => {
  client.initializeDependencies();

  await client.setDataProvider(createProvider(config.get('PROVIDER_TYPE')));

  if (config.get('TESTING_GUILD_ID')) {
    client.deployer.rest.setToken(config.get('TOKEN'));
    await client.deployer.deployToTestingGuild();
  }
});

client.on('guildDelete', async(guild) => {
  await client.dataProvider.clear(guild);
});

// This will be removed in a future update.
client.on('messageCreate', (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(client.prefix)) {
    return;
  }

  const args = message.content.slice(client.prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();
  const command = client.registry.resolveCommand(commandName);

  if (command) {
    return message.reply(`Commands have been turned into slash commands and you may not use them with the prefix anymore. You can run the command you tried to input by running: **/${commandName}**`);
  }
});

client.login(config.get('TOKEN'));
