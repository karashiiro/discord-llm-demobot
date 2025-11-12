# NixOS Deployment Guide

This guide explains how to deploy the Discord LLM Demo Bot as a systemd service on NixOS with proper secrets management.

## Overview

The NixOS module provides:
- **Automatic service management**: systemd service with automatic restart on failure
- **Secure secrets handling**: Secrets are kept outside the Nix store using `EnvironmentFile`
- **Security hardening**: Sandboxed service with restricted permissions
- **Automatic command deployment**: Optionally deploys Discord slash commands on service start
- **Resource limits**: Memory and task limits to prevent runaway processes

## Quick Start

### 1. Add the Flake to Your System Configuration

Add this bot to your `flake.nix` inputs:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    discord-llm-demobot = {
      url = "github:karashiiro/discord-llm-demobot";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, discord-llm-demobot, ... }: {
    nixosConfigurations.yourhost = nixpkgs.lib.nixosSystem {
      modules = [
        # Import the discord bot module
        discord-llm-demobot.nixosModules.default

        # Your configuration
        ./configuration.nix
      ];

      # Make the bot package available
      specialArgs = {
        discord-llm-demobot-pkg = discord-llm-demobot.packages.x86_64-linux.default;
      };
    };
  };
}
```

### 2. Create a Secrets File

Create a file **outside your Nix configuration** to store secrets. For example, `/var/lib/discord-llm-demobot/secrets.env`:

```bash
# Create the secrets file (as root)
sudo mkdir -p /var/lib/discord-llm-demobot
sudo touch /var/lib/discord-llm-demobot/secrets.env
sudo chmod 600 /var/lib/discord-llm-demobot/secrets.env
```

Edit the file with your secrets:

```env
DISCORD_TOKEN=your_actual_discord_bot_token_here
CHAT_API_KEY=your_actual_api_key_here
```

**Important**: Never commit this file to git or include it in your Nix configuration!

### 3. Configure the Service

In your `configuration.nix` or a separate module:

```nix
{ config, pkgs, discord-llm-demobot-pkg, ... }:

{
  # Enable the bot service
  services.discord-llm-demobot = {
    enable = true;

    # Use the package from the flake
    package = discord-llm-demobot-pkg;

    # Path to secrets file (outside Nix store!)
    environmentFile = "/var/lib/discord-llm-demobot/secrets.env";

    # Discord configuration
    discord = {
      clientId = "YOUR_DISCORD_CLIENT_ID";  # Not secret, can be in Nix config
    };

    # Chat API configuration
    chat = {
      endpointUrl = "https://api.openai.com";
      model = "gpt-3.5-turbo";
      temperature = 0.7;
      maxTokens = 1000;
    };

    # Automatically deploy slash commands on service start
    deployCommands = true;
  };
}
```

### 4. Rebuild and Start

```bash
# Rebuild your system
sudo nixos-rebuild switch

# Check service status
sudo systemctl status discord-llm-demobot

# View logs
sudo journalctl -u discord-llm-demobot -f
```

## Configuration Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `services.discord-llm-demobot.enable` | bool | Enable the service |
| `services.discord-llm-demobot.environmentFile` | path | Path to secrets file |
| `services.discord-llm-demobot.discord.clientId` | string | Discord client ID |
| `services.discord-llm-demobot.chat.endpointUrl` | string | OpenAI-compatible API URL |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `services.discord-llm-demobot.package` | package | `pkgs.discord-llm-demobot` | Package to use |
| `services.discord-llm-demobot.user` | string | `"discord-llm-demobot"` | Service user |
| `services.discord-llm-demobot.group` | string | `"discord-llm-demobot"` | Service group |
| `services.discord-llm-demobot.chat.model` | string | `"gpt-3.5-turbo"` | Chat model |
| `services.discord-llm-demobot.chat.temperature` | float | `0.7` | Response temperature |
| `services.discord-llm-demobot.chat.maxTokens` | int | `1000` | Max tokens |
| `services.discord-llm-demobot.deployCommands` | bool | `true` | Auto-deploy slash commands |
| `services.discord-llm-demobot.stateDirectory` | string | `"discord-llm-demobot"` | State directory name |

## Secrets Management

The module supports multiple approaches for managing secrets:

### Option 1: Simple File (Recommended for Getting Started)

Store secrets in a file with restricted permissions:

```bash
# Create secrets file
sudo mkdir -p /var/lib/discord-llm-demobot
sudo tee /var/lib/discord-llm-demobot/secrets.env > /dev/null <<EOF
DISCORD_TOKEN=your_token_here
CHAT_API_KEY=your_api_key_here
EOF

# Restrict permissions
sudo chown discord-llm-demobot:discord-llm-demobot /var/lib/discord-llm-demobot/secrets.env
sudo chmod 600 /var/lib/discord-llm-demobot/secrets.env
```

Configuration:
```nix
services.discord-llm-demobot.environmentFile = "/var/lib/discord-llm-demobot/secrets.env";
```

### Option 2: agenix (Recommended for Production)

[agenix](https://github.com/ryantm/agenix) encrypts secrets with age and stores them in your Nix configuration.

1. Add agenix to your flake inputs:
```nix
inputs.agenix.url = "github:ryantm/agenix";
```

2. Create encrypted secrets:
```bash
# Create a secrets file
mkdir -p secrets
agenix -e secrets/discord-bot.age
```

3. Configure:
```nix
{ config, ... }:
{
  age.secrets.discord-bot = {
    file = ./secrets/discord-bot.age;
    owner = "discord-llm-demobot";
    group = "discord-llm-demobot";
  };

  services.discord-llm-demobot = {
    enable = true;
    environmentFile = config.age.secrets.discord-bot.path;
    # ... other options
  };
}
```

### Option 3: sops-nix

[sops-nix](https://github.com/Mic92/sops-nix) uses SOPS for secret management with multiple key backends.

1. Add sops-nix to your flake:
```nix
inputs.sops-nix.url = "github:Mic92/sops-nix";
```

2. Create encrypted secrets:
```bash
sops secrets/discord-bot.yaml
```

3. Configure:
```nix
{ config, ... }:
{
  sops.secrets."discord-bot/env" = {
    owner = "discord-llm-demobot";
  };

  services.discord-llm-demobot = {
    enable = true;
    environmentFile = config.sops.secrets."discord-bot/env".path;
    # ... other options
  };
}
```

## Manual Command Deployment

If you set `deployCommands = false`, you can manually deploy commands:

```bash
# As root or with sudo
sudo -u discord-llm-demobot \
  DISCORD_TOKEN="your_token" \
  DISCORD_CLIENT_ID="your_client_id" \
  discord-llm-demobot-deploy-commands
```

Or trigger the deploy service:
```bash
sudo systemctl start discord-llm-demobot-deploy
```

## Troubleshooting

### Service won't start

Check logs:
```bash
sudo journalctl -u discord-llm-demobot -n 50
```

Common issues:
- **Missing secrets**: Ensure `environmentFile` exists and contains required variables
- **Wrong permissions**: Secrets file must be readable by the bot user
- **Invalid token**: Check that DISCORD_TOKEN is correct
- **Network issues**: Ensure the server can reach Discord and your chat API

### View service status

```bash
# Service status
sudo systemctl status discord-llm-demobot

# Recent logs
sudo journalctl -u discord-llm-demobot -n 100

# Follow logs in real-time
sudo journalctl -u discord-llm-demobot -f

# Check if command deployment succeeded
sudo journalctl -u discord-llm-demobot-deploy
```

### Restart the service

```bash
sudo systemctl restart discord-llm-demobot
```

### Disable the service

```bash
# Temporarily
sudo systemctl stop discord-llm-demobot

# Permanently (in configuration.nix)
services.discord-llm-demobot.enable = false;
# Then: sudo nixos-rebuild switch
```

## Security Considerations

The systemd service includes several security hardening features:

- **PrivateTmp**: Isolated /tmp directory
- **ProtectSystem**: Read-only access to system directories
- **ProtectHome**: No access to user home directories
- **NoNewPrivileges**: Cannot escalate privileges
- **PrivateDevices**: No access to physical devices
- **RestrictAddressFamilies**: Only IPv4/IPv6 network access
- **SystemCallFilter**: Restricted system calls
- **MemoryMax**: Limited to 512MB RAM
- **TasksMax**: Limited to 50 tasks

Secrets handling:
- Secrets are **never** stored in the Nix store (which is world-readable)
- Secrets file must have restrictive permissions (600 recommended)
- Consider using agenix or sops-nix for encrypted secrets in git

## Building the Package Locally

### First-Time Setup: Getting the npmDepsHash

When you first build this package (or after updating npm dependencies), you'll need to calculate the `npmDepsHash`:

```bash
# Clone the repository
git clone https://github.com/karashiiro/discord-llm-demobot
cd discord-llm-demobot

# Try to build - it will fail and show the correct hash
nix build --show-trace

# The error will show something like:
#   got:    sha256-Abc123...
# Copy that hash and update flake.nix
```

Or use the prefetch command:
```bash
nix-prefetch -f '<nixpkgs>' 'buildNpmPackage { src = ./.; }'
```

### Building

To build without adding to your system configuration:

```bash
# Build the package
nix build github:karashiiro/discord-llm-demobot

# Run directly
./result/bin/discord-llm-demobot

# Or enter a development shell
nix develop github:karashiiro/discord-llm-demobot
```

## Example: Complete Configuration

Here's a complete example with all components:

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    discord-llm-demobot.url = "github:karashiiro/discord-llm-demobot";
  };

  outputs = { self, nixpkgs, discord-llm-demobot }: {
    nixosConfigurations.myserver = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        discord-llm-demobot.nixosModules.default
        {
          nixpkgs.overlays = [
            (final: prev: {
              discord-llm-demobot = discord-llm-demobot.packages.x86_64-linux.default;
            })
          ];
        }
        ./configuration.nix
      ];
    };
  };
}

# configuration.nix
{ config, pkgs, ... }:
{
  # Bot service configuration
  services.discord-llm-demobot = {
    enable = true;
    environmentFile = "/var/lib/discord-llm-demobot/secrets.env";

    discord.clientId = "1234567890123456789";

    chat = {
      endpointUrl = "https://api.openai.com";
      model = "gpt-4";
      temperature = 0.8;
      maxTokens = 2000;
    };
  };

  # Optional: Open firewall if needed (usually not required)
  # networking.firewall.allowedTCPPorts = [ ];
}
```

## Getting Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section:
   - Click "Add Bot"
   - Click "Reset Token" to get your `DISCORD_TOKEN`
   - Enable "Message Content Intent"
4. Go to "OAuth2" section:
   - Copy the "Application ID" - this is your `DISCORD_CLIENT_ID`
5. Invite the bot to your server:
   - Use OAuth2 URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: Send Messages, Create Public Threads, Send Messages in Threads
   - Use the generated URL to invite the bot

## Additional Resources

- [Main README](./README.md) - General bot documentation
- [Discord.js Guide](https://discordjs.guide/) - Discord bot development
- [NixOS Manual](https://nixos.org/manual/nixos/stable/) - NixOS configuration guide
- [agenix](https://github.com/ryantm/agenix) - Age-encrypted secrets for Nix
- [sops-nix](https://github.com/Mic92/sops-nix) - SOPS secrets for Nix
