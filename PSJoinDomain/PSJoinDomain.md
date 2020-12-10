# MDT PSJoinDomain - A Better Domain Binding Experience in MDT Using Powershell

* [Introduction](#introduction)
    * [Advantages of my replacement](#advantages-of-my-replacement)
        * [Task Sequence Filtering](#task-sequence-filtering)
        * [Preventing Reboots](#preventing-reboots)
        * [Retry Prompts](#retry-prompts)
* [The Setup](#the-setup)
    * [Gathering Credentials](#gathering-credentials)
    * [Prompting for retry](#prompting-for-retry)
    * [Putting it all together](#putting-it-all-together)
        * [Quick Start](#quick-start)
    * [Using the script in MDT](#using-the-script-in-mdt)

---

## Introduction

If you'd like to skip the explanation and move straight to setup click [here](#quick-start).

The domain join replacement actually came from an experiment of mine where I wanted to add a computer to a security group in an MDT task sequence. I was trying to filter all our domain machines that we imaged with a specific Windows build to apply a different set of group policy. I was successful in creating a process for adding the computer to a security group in the MDT TS, but eventually found that using a WMI Filter was a better fit for my situation. And in the process of creating my Add a Computer to an AD Security Group in MDT script I wrote a replacement for the included `Join Domain` step that runs `ZTIDomainJoin.wsf`. 

## Advantages of my replacement

### Task Sequence Filtering
The domain join replacement has some advantages that I required to add a computer to a security group. Most notably I added a task sequence variable that I could use to filter other steps in my task sequence, if `DomainJoinFailure` as `true` then we can skip trying to add the computer to the security group. 

### Preventing Reboots
Another big advantage of this replacement, is we no longer need a reboot to complete running through the TS. Legal banners being pushed through group policy are standard in most organizations, this becomes problematic due to it causing MDT to pause and wait for someone to accept the legal agreement. Avoiding a reboot avoids the legal banner, and brings a more streamlined experience for technicians. I've seen other work arounds that put machines imaged through MDT in a specific OU and then move them later on. I can see that being a solution for some environments but it either requires manually moving computers around or automating that process. And for me, it doesn't automate well in a complex AD environment.

### Retry Prompts
The behavior of the default domain join script is to reboot and retry to join the domain 4 times before moving onto the next step in the process. This can be problematic for a number of reasons, the machine could be BitLocker encrypted and protection is enabled, or you might have an intermittent connectivity issue, or there might be an issue with an AD object. Whatever the reason, I decided to manage error handling by using a WinForms `MessageBox` that gives a retry option to the technician imaging the system.

## The Setup
### "Talk is cheap, show me the code." -Linus Torvalds
### Gathering Credentials
First things first we need a way to join the domain in PowerShell. Thankfully `Add-Computer` does just that. However, we can't just call `Add-Computer` and expect to get onto the domain. We need to use credentials supplied by MDT. So, how do we get these credentials? Well it's fairly simple. The next two lines of code export all the variables in our task sequence environment.

```powershell
$tsenv = New-Object -COMObject Microsoft.SMS.TSEnvironment
$tsenv.GetVariables() | ForEach-Object { Set-Variable -Name "$_" -Value "$($tsenv.Value($_))" }
```
This gives us access to three variables required to join a domain `$UserID` `$UserPassword` and `UserDomain`. All these variables are actually Base64 encoded strings, the encoding is used by MDT for obfuscation. Knowing this, we will need to convert these Base64 encoded values to UTF-8, and to accomplish it, we will use a function that we can call on each of the required variables.
```powershell
function ConvertFrom-Base64($Base64_String) { 
    $Bytes  = [System.Convert]::FromBase64String($Base64_String); 
    $Decoded_String = [System.Text.Encoding]::UTF8.GetString($Bytes); 
    return $Decoded_String
}
```
Now that we have this figured out we can create a function that returns the PSCredential object we need for our Domain Join.
```powershell
function Get-CredentialsfromTSVar {
    # Decode and set variables for user credentials
    $ClearID = ConvertFrom-Base64 -stringfrom "$UserID"
    $ClearDomain = ConvertFrom-Base64 -stringfrom "$UserDomain"
    $SecurePW = ConvertFrom-Base64 -stringfrom "$UserPassword" | ConvertTo-SecureString -AsPlainText -Force
    $User = "$ClearDomain\$ClearID"
    # Create credential object
    $LocalCreds = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $User,$SecurePW
    # Return credential object
    return $LocalCreds
}
```

### Prompting for retry
Now that we have a way of gathering and creating a credential object. Lets create a retry prompt that we can use in our domain join function later on. In order to run win forms we will need to load the assembly. We leave the load out of our retry function because the command only needs to be executed once.
```powershell
[System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") | Out-Null
```
Now to write a helpful popup. Our message is going to be used as part of a {try}{catch} block so we can include the error causing domain join to fail in our output, using `$Error[0]` as part of the message. In this function, we set the message, the type of message box, the icon to use and which button is default when the prompt is displayed. Finally, our function returns the value returned by the message box. Because we are using `RetryCancel` our responses will either be the strings `Retry` or `Cancel` which will help us create our logic later on.
```powershell
function Get-RetryJoinDialogBox {
    $retryJoinDialogMessage = "{0}" -f $Error[0]
    $retryJoinDialogInfo = "`nPlease fix computer object issues and select retry to reattempt computer bind operation, otherwise select cancel to continue the deployment.`
`nNote: If the computer name is incorrect you will need to finish the deployment and manually run the binding process."
    $retryJoinDialogButtonType = [System.Windows.Forms.MessageBoxButtons]::RetryCancel
    $retryJoinDialogIconType = [System.Windows.Forms.MessageBoxIcon]::Warning
    $retryJoinDialogDefaultButton = [System.Windows.Forms.MessageBoxDefaultButton]::Button1
    return [System.Windows.Forms.MessageBox]::Show(("{0}`n{1}" -f $retryJoinDialogMessage, $retryJoinDialogInfo), "Domain Join Failure", $retryJoinDialogButtonType, $retryJoinDialogIconType, $retryJoinDialogDefaultButton)
}
```
Our MessageBox will look very similar to this...

![Message Box](/src/MessageBox.png)

### Putting it all together
Now we can put everything together into a cohesive function. Our function will accept the PSCredential object that was returned by our `Get-CredentialsfromTSVar` function and we'll be able to use `Add-Computer` with the credentials from our task sequence variables. One thing I've glossed over up until this point is the script relies on a supplied variable `DomainFQDN` this variable exists to avoid any DNS related issues.

Our logic here is going to be very simple. Should `Add-Computer` fail our message box will appear. If our user clicks `Retry`, we will call the same function again supplying the same credentials. Should our user click `Cancel` we will want to know that there was an error. So we add the following code `$tsenv.Value("DomainJoinFailure") = $true`, this adds `DomainJoinFailure` to our Task Sequence Variables.
```powershell
function JoinDomainwithErrorHandling {
    param (
        [Parameter(Mandatory=$true)]
        [PSCredential]$Credential
    )
    # Splatting to keep our Add-Computer command looking clean
    $ComputerAddArgs = @{
        DomainCredential = $Credential 
        DomainName = $DomainFQDN
        WarningAction = 'Ignore'
        ErrorAction = 'Stop'
    }
    try {
        Add-Computer @ComputerAddArgs
    }
    catch {
        #  Create message dialogbox scriptblock
        $RetryorCancel = Get-RetryJoinDialogBox
        # Open dialog window
        if ($RetryorCancel -eq 'Retry'){
            JoinDomainwithErrorHandling -Credential $Credential
        }
        else {
            # Add new variable for filtering in the task sequence
            $tsenv.Value("DomainJoinFailure") = $true
            # Write the error so it shows in the logs and when the TS finishes
            Write-Error $_
        }
    }
}
```

And finally to finish off the script we will need to call our functions.
```powershell
$Credential = Get-CredentialsfromTSVar
JoinDomainwithErrorHandling $Credential
```

#### Quick Start

Regardless of how you got here, copy the [JoinDomainwithRetry.ps1](https://raw.githubusercontent.com/samuelzamvil/MDT-PSJoinDomain/master/JoinDomainwithRetry.ps1) script to your `DeploymentShare\Scripts` folder.

### Using the script in MDT

Before we can use this script we will need to modify our `Unattended.xml` found in `DeploymentShare\Control\<Task Sequence Number>` file to avoid a domain join on first boot. In the section `<settings pass="specialize">` we will remove the following...
```xml
<component name="Microsoft-Windows-UnattendedJoin" processorArchitecture="amd64" publicKeyToken="" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
    <Identification>
        <Credentials>
            <Username></Username>
            <Domain></Domain>
            <Password></Password>
        </Credentials>
        <JoinDomain></JoinDomain>
        <JoinWorkgroup></JoinWorkgroup>
        <MachineObjectOU></MachineObjectOU>
    </Identification>
</component>
```

With the `Microsoft-Windows-UnattendedJoin` removed from our `Unattended.xml` file, we now have to <font color="red"><b>disable "Recover From Domain"</b></font> in our task sequence. If we leave it enabled, we will attempt to bind to the domain once the step is reached and if we delete "Recover From Domain" we will not see Join Domain as an option in the Task Sequence Wizard and the `JOINDOMAIN` variable will not be created.

We are now ready to add our `DomainJoinWithRetry.ps1` script to MDT. Add a `Run PowerShell Script` step to our Task Sequence whereever you'd like the domain bind to take place. Personally I like to have this as one of the final steps since it has the possibility of pausing a deployment.

Name the step whatever you'd like, I am using `Run Domain Join` and add `DomainJoinWithRetry.ps1` under PowerShell script and for our Parameter enter `-DomainFQDN '<Domain FQDN Goes Here>'` replacing what's enclosed in `<>` brackets. Our Task Sequence Step will look like so...

![Domain Join Task Sequence](/src/DomainJoinTS.png)

To avoid this script from running in case a user decides to join a machine to a WorkGroup we will filter the step based on if the `JOINDOMAIN` variable `exists`. The options for our script should look like so...

![JoinDomain Filter Options](/src/JoinDomainFilter.png)

If you would like to kick off an additional step in your TS in the event domain join is a failure we can acomplish this by adding an `if` statement to a Task Sequence Step or Group and checking for the existence of the `DomainJoinFailure` variable that we included in our script.

![Failure Filter Options](/src/FailureFilter.png)

I have also created a script that will add some logging information to a CSV and fire off a slack webhook. I will not go over how it works, however, I will include it in this repo in case someone else might get some use from the [WriteOutFailedDomainJoin.ps1](https://raw.githubusercontent.com/samuelzamvil/MDT-PSJoinDomain/master/WriteOutFailedDomainJoin.ps1) script.
