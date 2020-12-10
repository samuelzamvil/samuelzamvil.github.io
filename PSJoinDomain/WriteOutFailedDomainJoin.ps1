function ConvertFrom-Base64($stringfrom) { 
    $bytesfrom  = [System.Convert]::FromBase64String($stringfrom); 
    $decodedfrom = [System.Text.Encoding]::UTF8.GetString($bytesfrom); 
     return $decodedfrom   
 }
#Create Task Sequence Environment Object
$tsenv = New-Object -COMObject Microsoft.SMS.TSEnvironment
# Export Task Sequence Variables
$tsenv.GetVariables() | ForEach-Object { Set-Variable -Name "$_" -Value "$($tsenv.Value($_))" }
#Decode UserID
$ClearID = ConvertFrom-Base64 -stringfrom "$UserID"
#Create PSCustomObject from TS Variables
$DeploymentInfo = [PSCustomObject]@{
    Date = Get-Date -Format '%M/%d/%y %H:%m'
    SerialNumber = $SerialNumber
    UserID = $ClearID
    ComputerName = $OSDCOMPUTERNAME
    TaskSequence = $TASKSEQUENCENAME
}
#Write out to CSV
$DeploymentInfo | Export-Csv -Path "$DeployRoot\<Deployment Share Logging Path Goes Here>" -Append
#Set Payload
$Body  = "payload={""text"": ""Failure to Join Domain`
\nDate = $($DeploymentInfo.Date)\nSerialNumber = $($DeploymentInfo.SerialNumber)\nComputerName = $($DeploymentInfo.ComputerName)\nUserID = $($DeploymentInfo.UserID)""}" 
#Set slack webhook uri
$SlackURI =  '<WebHook URI Goes Here>'
#Hit Slack with a notification
Invoke-WebRequest -Uri $SlackURI -Body $Body -Method Post