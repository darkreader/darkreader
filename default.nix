let
  pkgs = import <nixpkgs> { };
  lib = pkgs.lib;
  nur = import (builtins.fetchTarball {
    url = "https://github.com/nix-community/NUR/archive/main.tar.gz";
    sha256 = "04387gzgl8y555b3lkz9aiw9xsldfg4zmzp930m62qw8zbrvrshd"; # Optional pin
  }) { inherit pkgs; };
  customEsbuild = pkgs.esbuild.overrideAttrs (
    finalAttrs: previousAttrs: {
      version = "0.24.0";
      src = pkgs.fetchFromGitHub {
        owner = "evanw";
        repo = "esbuild";
        rev = "v${finalAttrs.version}";
        hash = "sha256-czQJqLz6rRgyh9usuhDTmgwMC6oL5UzpwNFQ3PKpKck=";
      };
    }
  );

  # Build Dark Reader from source
  darkreaderBuild = pkgs.buildNpmPackage {
    pname = "dark-reader";
    version = "4.9.106";
    npmDepsHash = "sha256-uA3/uv5ZNa2f4l2ZhmNCzX+96FKlQCq4XlK5QkfYQQU=";
    env.ESBUILD_BINARY_PATH = lib.getExe customEsbuild;

    src = ./.;

    installPhase = ''
      mkdir -p $out
      cp build/release/darkreader-firefox.xpi $out/latest.xpi
    '';
  };
in
nur.repos.rycee.firefox-addons.darkreader.overrideAttrs (oldAttrs: {
  src = darkreaderBuild;
})
