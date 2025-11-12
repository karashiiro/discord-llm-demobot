{
  description = "Discord LLM Demo Bot - A Discord bot for AI chat interactions";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_20;

        # Build the Discord bot package
        discord-llm-demobot = pkgs.buildNpmPackage {
          pname = "discord-llm-demobot";
          version = "1.0.0";

          src = ./.;

          # To get the correct hash:
          # 1. Set this to an empty string or fake hash
          # 2. Run: nix build
          # 3. Nix will fail and show you the correct hash
          # 4. Update this value with the correct hash
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; # Replace with actual hash

          nativeBuildInputs = [ nodejs ];

          # Build the TypeScript project
          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';

          # Install the built application
          installPhase = ''
            runHook preInstall

            mkdir -p $out/lib/discord-llm-demobot

            # Copy the compiled JavaScript
            cp -r dist $out/lib/discord-llm-demobot/

            # Copy node_modules (only production dependencies)
            cp -r node_modules $out/lib/discord-llm-demobot/

            # Copy package.json for metadata
            cp package.json $out/lib/discord-llm-demobot/

            # Create a wrapper script
            mkdir -p $out/bin
            cat > $out/bin/discord-llm-demobot <<EOF
            #!${pkgs.bash}/bin/bash
            exec ${nodejs}/bin/node $out/lib/discord-llm-demobot/dist/index.js "\$@"
            EOF
            chmod +x $out/bin/discord-llm-demobot

            # Create deploy-commands wrapper
            cat > $out/bin/discord-llm-demobot-deploy-commands <<EOF
            #!${pkgs.bash}/bin/bash
            exec ${nodejs}/bin/node $out/lib/discord-llm-demobot/dist/deployCommands.js "\$@"
            EOF
            chmod +x $out/bin/discord-llm-demobot-deploy-commands

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "A Discord bot that provides AI chat functionality";
            homepage = "https://github.com/karashiiro/discord-llm-demobot";
            license = licenses.mit;
            maintainers = [ ];
            mainProgram = "discord-llm-demobot";
          };
        };

      in {
        packages = {
          default = discord-llm-demobot;
          discord-llm-demobot = discord-llm-demobot;
        };

        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pkgs.nodePackages.typescript
            pkgs.nodePackages.npm
          ];
        };
      }
    ) // {
      # NixOS module
      nixosModules.default = import ./nixos-module.nix;
    };
}
