# ################################################################################
# Author: Samuel Zamvil, Senior Systems Engineer
# Project: MDT - PS Domain Join
# Description: Used to replace the builtin domain join VB script
# Use cases:
# Do task sequence filtering based on created DomainJoinFailure TS Variable
# Remove the reboot from MDT task sequence
# Notes: 
# This script requires additional configuration of Unattended.xml to work
# This is untested on Powershell versions below 5.1
# Requirements: Powershell 5.1
# Development Env: Windows 10 (1909), Windows LTSC (1809)
# Version: Powershell 5.1
# Date: 03/30/2020
# ################################################################################
param (
        [Parameter(Mandatory=$true)]
        $DomainFQDN
    )

function ConvertFrom-Base64($Base64_String) { 
    $Bytes  = [System.Convert]::FromBase64String($Base64_String); 
    $Decoded_String = [System.Text.Encoding]::UTF8.GetString($Bytes); 
    return $Decoded_String
}
$tsenv = New-Object -COMObject Microsoft.SMS.TSEnvironment
$tsenv.GetVariables() | ForEach-Object { Set-Variable -Name "$_" -Value "$($tsenv.Value($_))" }
[System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") | Out-Null
function Get-CredentialsfromTSVar {
    # Decode and set variables for user credentials
    $ClearID = ConvertFrom-Base64 -stringfrom "$UserID"
    $ClearDomain = ConvertFrom-Base64 -stringfrom "$UserDomain"
    $SecurePW = ConvertFrom-Base64 -stringfrom "$UserPassword" | ConvertTo-SecureString -AsPlainText -Force
    $User = "$ClearDomain\$ClearID"
    # Store credential object
    $LocalCreds = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $User,$SecurePW
    return $LocalCreds
}

function Get-RetryJoinDialogBox {
    $retryJoinDialogMessage = "{0}" -f $Error[0]
    $retryJoinDialogInfo = "`nPlease fix computer object issues and select retry to reattempt computer bind operation, otherwise select cancel to continue the deployment.`
`nNote: If the computer name is incorrect you will need to finish the deployment and manually run the binding process."
    $retryJoinDialogButtonType = [System.Windows.Forms.MessageBoxButtons]::RetryCancel
    $retryJoinDialogIconType = [System.Windows.Forms.MessageBoxIcon]::Warning
    $retryJoinDialogDefaultButton = [System.Windows.Forms.MessageBoxDefaultButton]::Button1
    return [System.Windows.Forms.MessageBox]::Show(("{0}`n{1}" -f $retryJoinDialogMessage, $retryJoinDialogInfo), "Domain Join Failure", $retryJoinDialogButtonType, $retryJoinDialogIconType, $retryJoinDialogDefaultButton)
}


function JoinDomainwithErrorHandling {
    param (
        [Parameter(Mandatory=$true)]
        [PSCredential]$Credential
    )
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


$Credential = Get-CredentialsfromTSVar
JoinDomainwithErrorHandling $Credential