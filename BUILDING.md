# Building Dark Reader

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Windows instructions

blah blah 

### Installing prerequisites 

some text idk

## macOS instructions

_macOS Mojave (10.14) or later is required_

### Installing prerequisites via Homebrew

1. Install [homebrew](https://brew.sh/) by pasting the script below in a terminal. _(Skip this step if you already have homebrew)_

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. After installing homebrew, execute this script below in a terminal.

```sh
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
| Gentoo               | `emerge --verbose net-libs/nodejs dev-vcs/git` | [`portage`](https://wiki.gentoo.org/wiki/Portage)             |
