const { SlashCommand } = require('@greencoast/discord.js-extended');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { MESSAGE_EMBED } = require('../../../common/constants');
const ProviderManager = require('../../../classes/tts/providers/ProviderManager');

class DefaultSettingsCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'default_settings',
      description: 'Get the default TTS settings currently set for the guild.',
      emoji: ':wrench:',
      group: 'config',
      guildOnly: true,
      dataBuilder: new SlashCommandBuilder()
    });
  }

  prepareFields(settings, localizer) {
    return Object.keys(ProviderManager.PROVIDER_FRIENDLY_NAMES).map((name) => {
      const friendlyName = ProviderManager.PROVIDER_FRIENDLY_NAMES[name];
      const values = settings[name];
      const valueKeys = Object.keys(values);

      if (valueKeys.length < 1) {
        return { title: friendlyName, text: localizer.t('command.settings.default.no_settings') };
      }

      const text = valueKeys.reduce((text, key) => {
        const setting = values[key];
        return text.concat(`• **${key}**: ${setting}\n`);
      }, '');

      return { title: friendlyName, text };
    });
  }

  async run(interaction) {
    const localizer = this.client.localizer.getLocalizer(interaction.guild);
    const currentSettings = await this.client.ttsSettings.getCurrentForGuild(interaction.guild);
    const { provider, ...restSettings } = currentSettings;

    const fields = this.prepareFields(restSettings, localizer);
    const embed = new MessageEmbed()
      .setTitle(localizer.t('command.settings.default.embed.title'))
      .setColor(MESSAGE_EMBED.color)
      .setDescription(localizer.t('command.settings.default.embed.description'))
      .addField(localizer.t('command.settings.default.current.provider'), ProviderManager.PROVIDER_FRIENDLY_NAMES[provider]);

    for (const key in fields) {
      const field = fields[key];
      embed.addField(field.title, field.text, true);
    }

    return interaction.reply({ embeds: [embed] });
  }
}

module.exports = DefaultSettingsCommand;
