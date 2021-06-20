# Building Dark Reader


## Microsoft Windows instructions

_Microsoft Windows 7 or later is required_

### Installing prerequisites via chocolatey

1. Follow the installation steps on [docs.chocolatey.org/choco/setup](https://docs.chocolatey.org/en-us/choco/setup).

2. After installation, run the script below.

```ps1
choco install nodejs git
```

### Installing prerequisites via scoop

1. Follow the installation steps on [lukesampson/scoop](https://github.com/lukesampson/scoop).

2. After installation, run this scrpt below.

```ps1
scoop install nodejs git
```

## macOS instructions

_macOS Mojave (10.14) or later is required_

### Installing prerequisites via Homebrew

1. Follow the installation steps on [brew.sh](https://brew.sh/).  _(Skip this step if you already have homebrew)_
 
2. After installation, run this script below in a terminal.

```bash
brew install node git
```

## Linux instructions

### Installing prerequisites via built-in package managers

| Distribution         | Command                                        | Package Manager                                               |
|----------------------|------------------------------------------------|---------------------------------------------------------------|
| Arch Linux / Manjaro | `sudo pacman -S nodejs git`                    | [`pacman`](https://wiki.archlinux.org/title/Pacman)           |
| CentOS / RHEL        | `sudo yum install nodejs git`                  | [`yum`](https://en.wikipedia.org/wiki/Yum_(software))         |
| Debian / Ubuntu      | `sudo apt install nodejs git`                  | [`apt`](https://en.wikipedia.org/wiki/APT_(software))         |
| Fedora               | `sudo dnf install nodejs git`                  | [`dnf`](https://docs.fedoraproject.org/en-US/quick-docs/dnf/) |
| Gentoo               | `emerge net-libs/nodejs dev-vcs/git`           | [`portage`](https://wiki.gentoo.org/wiki/Portage)             |
