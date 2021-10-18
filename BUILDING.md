# Building Dark Reader

## Table of Contents

- Placeholder

## Installing prerequisites

The step below installs:

- [git](https://git-scm.com/)
- [NodeJS](https://nodejs.org/)

If you already have these you can skip this and proceed to the [next step](#cloning)

### Microsoft Windows

_Microsoft Windows 7 or later is required_

#### Chocolatey

1. Follow the installation steps on [docs.chocolatey.org/choco/setup](https://docs.chocolatey.org/en-us/choco/setup).

2. After installation, run the script below.

```ps1
choco install nodejs git
```

#### Scoop

1. Follow the installation steps on [lukesampson/scoop](https://github.com/lukesampson/scoop).

2. After installation, run this command below.

```ps1
scoop install nodejs git
```

### macOS

_macOS Mojave (10.14) or later is required_

#### Homebrew

1. Follow the installation steps on [brew.sh](https://brew.sh/).  _(Skip this step if you already have homebrew)_
 
2. After installation, run this command below in a terminal.

```bash
brew install node git
```

### Linux

#### Installing prerequisites via built-in package managers

Find your distrobution below and run the command listed in your built-in terminal / console.

| Distribution         | Command                                              | Package Manager                                           |
|----------------------|------------------------------------------------------|-----------------------------------------------------------|
| Arch Linux / Manjaro | `sudo pacman -S nodejs git`                          | [`pacman`](https://wiki.archlinux.org/title/Pacman)       |
| CentOS / RHEL        | `sudo yum install nodejs git`                        | [`yum`](https://en.wikipedia.org/wiki/Yum_(software))     |
| Debian / Ubuntu      | `sudo apt update && sudo apt install nodejs npm git` | [`apt`](https://en.wikipedia.org/wiki/APT_(software))     |
| Fedora               | `sudo dnf install nodejs git`                    | [`dnf`](https://docs.fedoraproject.org/en-US/quick-docs/dnf/) |
| Gentoo               | `emerge net-libs/nodejs dev-vcs/git`             | [`portage`](https://wiki.gentoo.org/wiki/Portage)             |

![image](https://user-images.githubusercontent.com/66189242/137605819-cb8f1971-9297-4d66-a46a-5c47cdfbd7f0.png)



## Cloning

1. Clone darkreader by running this command below:

```sh
git clone https://github.com/darkreader/darkreader.git
```

![image](https://user-images.githubusercontent.com/66189242/126913195-4d517b8d-8766-49a1-b85f-e908999fe50e.png)

2. Then change your current directory to `darkreader`

```sh
cd darkreader
```

![image](https://user-images.githubusercontent.com/66189242/137685485-7c5c7efc-62e1-4f97-8609-73848dc1ded1.png)


> **Note**: If you want to clone another fork of darkreader you can do:
> ```sh
> git clone https://github.com/USER/REPO_NAME.git
> ```
>
> For example if we want to clone `example`s darkreader at https://github.com/example/darkreader, we can do:
> ```sh
> git clone https://github.com/example/darkreader.git
> ```


3. *(Optional)* If you want to change the branch to test another version of darkreader you can do:
 
```sh
git checkout [BRANCH NAME]
```

![image](https://user-images.githubusercontent.com/66189242/126913746-a4ade6ab-96d1-41b0-ab6c-2409f5155107.png)


You can get a list of branches by doing:

```sh
git branch -va
```
 
![image](https://user-images.githubusercontent.com/66189242/137687124-c69c6445-096b-413b-b35e-de7abd50012c.png)

> **Note**: Remember to remove the `origin/` and `remotes/` parts on the list!
> 
> For example, `remotes/origin/CORS-Patch` becomes `CORS-Patch`

> 
> ---
> 
> If you want to exit, you can press `q` to exit.

## Building

1. Install darkreaders dependencies by running:

```sh
npm install
```


