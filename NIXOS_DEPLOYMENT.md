# NixOS Deployment Guide

This guide shows how to deploy the Discord LLM Demo Bot as a systemd service on NixOS with secure secrets management.

## Overview

The bot runs as a systemd service with:
- Secrets stored outside your Nix configuration (using a simple env file)
- Automatic service restarts on failure
- Security hardening and resource limits
- Automatic Discord command deployment

## Setup

### 1. Add to Your System Flake

In your system's `flake.nix`, add the bot as an input:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    discord-llm-demobot.url = "github:karashiiro/discord-llm-demobot";
  };

  outputs = { self, nixpkgs, discord-llm-demobot, ... }: {
    nixosConfigurations.yourhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        # Import the bot's NixOS module
        discord-llm-demobot.nixosModules.default

        # Make the package available
        {
          nixpkgs.overlays = [(final: prev: {
            discord-llm-demobot = discord-llm-demobot.packages.x86_64-linux.default;
          })];
        }

        ./configuration.nix
      ];
    };
  };
}
```

### 2. Create a Secrets File

Create `/var/lib/discord-llm-demobot/secrets.env` with your tokens:

```bash
# As root
sudo mkdir -p /var/lib/discord-llm-demobot
sudo tee /var/lib/discord-llm-demobot/secrets.env > /dev/null <<EOF
DISCORD_TOKEN=your_discord_bot_token_here
CHAT_API_KEY=your_openai_api_key_here
EOF

# Make it readable only by root (will be accessed by the bot service user)
sudo chmod 600 /var/lib/discord-llm-demobot/secrets.env
```

**Important**: Never commit this file to git!

### 3. Configure the Service

In your `configuration.nix`:

```nix
{ config, pkgs, ... }:
{
  services.discord-llm-demobot = {
    enable = true;

    # Path to your secrets file
    environmentFile = "/var/lib/discord-llm-demobot/secrets.env";

    # Your Discord app's client ID (not secret - safe to put here)
    discord.clientId = "YOUR_CLIENT_ID_HERE";

    # Chat API settings
    chat = {
      endpointUrl = "https://api.openai.com";
      model = "gpt-3.5-turbo";
    };
  };
}
```

### 4. Deploy

```bash
sudo nixos-rebuild switch
```

That's it! The bot should now be running.

## Getting Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. **Bot section**:
   - Click "Add Bot"
   - Click "Reset Token" → this is your `DISCORD_TOKEN`
   - Enable "Message Content Intent"
4. **OAuth2 section**:
   - Copy "Application ID" → this is your `DISCORD_CLIENT_ID`
5. **Invite the bot**:
   - OAuth2 → URL Generator
   - Scopes: `bot`, `applications.commands`
   - Permissions: Send Messages, Create Public Threads, Send Messages in Threads
   - Use generated URL to invite to your server

## Checking Status

```bash
# View service status
sudo systemctl status discord-llm-demobot

# View logs
sudo journalctl -u discord-llm-demobot -f

# Restart the service
sudo systemctl restart discord-llm-demobot
```

## Configuration Options

All options for `services.discord-llm-demobot`:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `enable` | bool | Yes | - | Enable the service |
| `environmentFile` | path | Yes | - | Path to secrets file |
| `discord.clientId` | string | Yes | - | Discord client ID |
| `chat.endpointUrl` | string | Yes | - | API endpoint URL |
| `chat.model` | string | No | `"gpt-3.5-turbo"` | Chat model |
| `chat.temperature` | float | No | `0.7` | Temperature (0.0-2.0) |
| `chat.maxTokens` | int | No | `1000` | Max tokens per response |
| `package` | package | No | `pkgs.discord-llm-demobot` | Package to use |
| `deployCommands` | bool | No | `true` | Auto-deploy slash commands |

## First-Time Build (Maintainers)

When building from source or updating dependencies, you need to get the `npmDepsHash`:

```bash
cd discord-llm-demobot
nix build --show-trace
```

This will fail and show the correct hash. Update `npmDepsHash` in `flake.nix` with that value.

## Advanced: Alternative Secret Management

For more sophisticated setups, you can use:
- [agenix](https://github.com/ryantm/agenix) - Age-encrypted secrets
- [sops-nix](https://github.com/Mic92/sops-nix) - SOPS-based secrets

Both work by setting `environmentFile` to their decrypted secret paths. See their respective documentation for setup.

## Troubleshooting

**Service won't start:**
```bash
sudo journalctl -u discord-llm-demobot -n 50
```

Common issues:
- Missing or incorrect `DISCORD_TOKEN` in secrets file
- Secrets file not readable (check permissions)
- Invalid Discord client ID
- Network connectivity issues

**Commands not showing in Discord:**
- Wait a few minutes (Discord can take time to register commands)
- Check deploy service logs: `sudo journalctl -u discord-llm-demobot-deploy`
- Manually redeploy: `sudo systemctl start discord-llm-demobot-deploy`
