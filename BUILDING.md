# Building Dark Reader

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Microsoft Windows instructions

_Microsoft Windows 7 or later is required_

### Installing prerequisites via Chocolatey

_Chocolatey installation steps based on [chocolatey.org/install](https://chocolatey.org/install)_


1. Make sure you're using powershell as an [administrator](https://www.howtogeek.com/194041/how-to-open-the-command-prompt-as-administrator-in-windows-8.1/ "HowToGeek: How to Open the Command Prompt as Administrator in Windows 8 or 10"). You can also install as a non-admin, check [Non-Administrative Installation](https://docs.chocolatey.org/en-us/choco/setup#non-administrative-install).

> ⚠️ __NOTE__: Please inspect [chocolatey.org/install.ps1](https://chocolatey.org/install.ps1) prior to running any of these scripts to ensure safety. We already know it's safe, but you should verify  the security and contents of any script from the internet you are not familiar with. All of these scripts download a remote PowerShell script and execute it on your machine. We take security very seriously. [Learn more about our security protocols](https://docs.chocolatey.org/en-us/information/security).

With PowerShell, you must ensure [`Get-ExecutionPolicy`](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-7.1) is not Restricted. We suggest using `Bypass` to bypass the policy to get things installed or `AllSigned` for quite a bit more security. 

One-liner:
```ps1
function menu{ do { do { write-host ""; write-host "1. Bypass [Suggested] (To bypass the policy to get things installed)"; write-host "2. AllSigned (A bit more security)"; write-host ""; write-host "X - Exit"; write-host ""; write-host -nonewline "Type your choice and press Enter: "; $choice = read-host; write-host ""; $ok = $choice -match '^[12]+$'; if ( -not $ok) { write-host "Invalid selection"; };  } until ( $ok ); switch -Regex ( $choice ) { "1"; { write-host("[DEBUG] Setting ExecutionPolicy to Bypass"); Set-ExecutionPolicy Bypass -Scope Process;}; "2"{ write-host("[DEBUG] Setting ExecutionPolicy to AllSigned"); Set-ExecutionPolicy AllSigned;}} } until ( $choice -match "X" );} write-host("[DEBUG] Creating execpolicy variable"); $execpolicy = Get-ExecutionPolicy 2>&1; write-host("[DEBUG] execpolicy content: " + $execpolicy); write-host("[DEBUG] Checking if execpolicy is Restricted"); if($execpolicy -eq "Restricted"){ write-host("[DEBUG] execpolicy is Restricted"); write-host("[DEBUG] Opening selection screen"); menu; write-host("[DEBUG] Closing selection screen"); write-host("[INFO] Just to be sure, run this again to check if it changed (:"); } else { write-host("[DEBUG] execpolicy is NOT Restricted"); write-host("[INFO] Ok, you're good now go on to the next step!"); }
```

Full code:
```ps1
<#
Note: This script hasn't been tested yet
DISClAIMER: I don't know how to write powershell code :c
#>

function menu {
    do {
        do {
            write-host ""
            write-host "1. Bypass [Suggested] (To bypass the policy to get things installed)"
            write-host "2. AllSigned (A bit more security)"
            write-host ""
            write-host "X - Exit"
            write-host ""
            write-host -nonewline "Type your choice and press Enter: "

            $choice = read-host

            write-host ""

            $ok = $choice -match '^[12]+$'

            if ( -not $ok) { write-host "Invalid selection" }
        } until ( $ok )

        switch -Regex ( $choice ) {
            "1"
            {
                write-host("[DEBUG] Setting ExecutionPolicy to Bypass")
                Set-ExecutionPolicy Bypass -Scope Process
            }

            "2"
            {
                write-host("[DEBUG] Setting ExecutionPolicy to AllSigned")
                Set-ExecutionPolicy AllSigned
            }
        }
    } until ( $choice -match "X" )
}
write-host("[DEBUG] Creating execpolicy variable")
$execpolicy = Get-ExecutionPolicy 2>&1
write-host("[DEBUG] execpolicy content: " + $execpolicy)

write-host("[DEBUG] Checking if execpolicy is Restricted")
if($execpolicy -eq "Restricted"){
   write-host("[DEBUG] execpolicy is Restricted")
   write-host("[DEBUG] Opening selection screen")
   menu
   write-host("[DEBUG] Closing selection screen")
   write-host("[INFO] Just to be sure, run this again to check if it changed (:")

} else {
   write-host("[DEBUG] execpolicy is NOT Restricted")
   write-host("[INFO] Ok, you're good now go on to the next step!")
}
```

3. Install with powershell.exe


Now execute the following script:

```ps1
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
```

3. After installing chocolatey, execute this script below to install the packages required.

```ps1
choco install nodejs git;
```

## macOS instructions

_macOS Mojave (10.14) or later is required_

### Installing prerequisites via Homebrew

1. Install [homebrew](https://brew.sh/) by pasting the script below in a terminal. _(Skip this step if you already have homebrew)_

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. After installing homebrew, execute this script below in a terminal to install the packages.

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
