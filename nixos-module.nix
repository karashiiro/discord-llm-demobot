{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.discord-llm-demobot;
in {
  options.services.discord-llm-demobot = {
    enable = mkEnableOption "Discord LLM Demo Bot service";

    package = mkOption {
      type = types.package;
      default = pkgs.discord-llm-demobot or (throw "discord-llm-demobot package not found. Please add it to your nixpkgs overlay or pass it explicitly.");
      defaultText = literalExpression "pkgs.discord-llm-demobot";
      description = "The discord-llm-demobot package to use.";
    };

    user = mkOption {
      type = types.str;
      default = "discord-llm-demobot";
      description = "User account under which the bot runs.";
    };

    group = mkOption {
      type = types.str;
      default = "discord-llm-demobot";
      description = "Group under which the bot runs.";
    };

    environmentFile = mkOption {
      type = types.path;
      description = ''
        Path to an environment file containing secrets.
        This file should contain:
        - DISCORD_TOKEN=your_discord_bot_token
        - CHAT_API_KEY=your_api_key (if required)

        The file should be readable only by the bot user for security.
        Example: /run/secrets/discord-llm-demobot or /var/lib/discord-llm-demobot/secrets.env
      '';
      example = "/run/secrets/discord-llm-demobot";
    };

    discord = {
      clientId = mkOption {
        type = types.str;
        description = "Discord application client ID.";
      };
    };

    chat = {
      endpointUrl = mkOption {
        type = types.str;
        description = "OpenAI-compatible chat API endpoint URL.";
        example = "https://api.openai.com";
      };

      model = mkOption {
        type = types.str;
        default = "gpt-3.5-turbo";
        description = "The model to use for chat completions.";
      };

      temperature = mkOption {
        type = types.float;
        default = 0.7;
        description = "Temperature for response generation (0.0 to 2.0).";
      };

      maxTokens = mkOption {
        type = types.int;
        default = 1000;
        description = "Maximum tokens per response.";
      };
    };

    deployCommands = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to automatically deploy Discord slash commands on service start.
        If false, you'll need to run discord-llm-demobot-deploy-commands manually.
      '';
    };

    stateDirectory = mkOption {
      type = types.str;
      default = "discord-llm-demobot";
      description = "Directory for storing bot state (created under /var/lib).";
    };
  };

  config = mkIf cfg.enable {
    # Create user and group
    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      description = "Discord LLM Demo Bot service user";
      home = "/var/lib/${cfg.stateDirectory}";
      createHome = true;
    };

    users.groups.${cfg.group} = {};

    # Systemd service for deploying commands (runs once before the main service)
    systemd.services.discord-llm-demobot-deploy = mkIf cfg.deployCommands {
      description = "Discord LLM Demo Bot - Deploy Commands";
      wantedBy = [ "discord-llm-demobot.service" ];
      before = [ "discord-llm-demobot.service" ];

      serviceConfig = {
        Type = "oneshot";
        User = cfg.user;
        Group = cfg.group;
        EnvironmentFile = cfg.environmentFile;
        WorkingDirectory = "/var/lib/${cfg.stateDirectory}";

        # Security hardening
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        NoNewPrivileges = true;
        PrivateDevices = true;
        ProtectKernelTunels = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" ];
        RestrictNamespaces = true;
        LockPersonality = true;
        RestrictRealtime = true;
        RestrictSUIDSGID = true;
        RemoveIPC = true;
        SystemCallFilter = [ "@system-service" "~@privileged" ];

        StateDirectory = cfg.stateDirectory;
      };

      environment = {
        DISCORD_CLIENT_ID = cfg.discord.clientId;
        # DISCORD_TOKEN will come from EnvironmentFile
      };

      script = ''
        echo "Deploying Discord slash commands..."
        ${cfg.package}/bin/discord-llm-demobot-deploy-commands
      '';
    };

    # Main systemd service
    systemd.services.discord-llm-demobot = {
      description = "Discord LLM Demo Bot";
      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];

      serviceConfig = {
        Type = "simple";
        User = cfg.user;
        Group = cfg.group;
        Restart = "on-failure";
        RestartSec = "10s";

        # Load secrets from environment file
        EnvironmentFile = cfg.environmentFile;

        WorkingDirectory = "/var/lib/${cfg.stateDirectory}";

        # Security hardening
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        NoNewPrivileges = true;
        PrivateDevices = true;
        ProtectKernelTunels = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" ];
        RestrictNamespaces = true;
        LockPersonality = true;
        RestrictRealtime = true;
        RestrictSUIDSGID = true;
        RemoveIPC = true;
        SystemCallFilter = [ "@system-service" "~@privileged" ];

        # Resource limits
        MemoryMax = "512M";
        TasksMax = 50;

        StateDirectory = cfg.stateDirectory;
      };

      environment = {
        # Non-secret configuration from NixOS config
        DISCORD_CLIENT_ID = cfg.discord.clientId;
        CHAT_ENDPOINT_URL = cfg.chat.endpointUrl;
        CHAT_MODEL = cfg.chat.model;
        CHAT_TEMPERATURE = toString cfg.chat.temperature;
        CHAT_MAX_TOKENS = toString cfg.chat.maxTokens;
        # DISCORD_TOKEN and CHAT_API_KEY will come from EnvironmentFile
      };

      script = ''
        echo "Starting Discord LLM Demo Bot..."
        echo "Configuration:"
        echo "  Client ID: $DISCORD_CLIENT_ID"
        echo "  Endpoint: $CHAT_ENDPOINT_URL"
        echo "  Model: $CHAT_MODEL"
        exec ${cfg.package}/bin/discord-llm-demobot
      '';
    };
  };
}
