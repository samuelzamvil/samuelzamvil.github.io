# Using 3rd Party Modules in a macOS Python3 Script

* [How it all started](#how-it-all-started)
* [Installing Python3 with BASH](#installing-python3-with-bash)
* [The Python Code](#building-our-api-call)
* [Bonus: Running the Script as a Daemon](#bonus-running-the-script-as-a-daemon)

---

## Edit 8/8/21
I've realized that installing the python3 pkg is not necessary and the desired result can be accomplished with the XCode Command Line tools version of python3 installed at /usr/bin/python3. The correct way to install packages to that version and use them as root is to use the ```--user``` flag in pip.

There is also a warning in python that running as root outside a venv with the system install can cause issues, I believe this warning is most likely for other unix systems since the install for macOS requires the addition Xcode command line tools install. Still there's no reason not to be cautious.

WARNING: Running pip as the 'root' user can result in broken permissions and conflicting behaviour with the system package manager. It is recommended to use a virtual environment instead: https://pip.pypa.io/warnings/venv

In the end, the best solution is going to be using a venv regardless of which version of python3 you are using.

At somepoint I may revisit this post with instructions on using a venv

#### <font color=red>Disclaimer</font>

This solution has not been tested in a production environment and I cannot comment on the longevity of this solution. However, from what I can tell there isn't anything here that would pose a security risk and the only best practie violation is not using a venv to install the packages and run the script.

Please be aware installing modules outside of a venv can cause issues with preexisting installations and users that require a specific version of a module be installed.

### How it all started

I recently found myself in a scripting exam that required me to consume an API on an end-user's machine and manipulate the data. For the exam I was given my choice of scripting languages to use, the smart and easy choice being BASH. Stubbornly, I chose Python. The task was easy enough that I was able write and test my script in relatively little time, as soon as I began to deploy the script, I realized I was in for some trouble.

#### I thought I had this all figured out in my head, but that thought process landed me in obscure territory.

My original intent was to use the version of Python3 installed on macOS Big Sur. I was going to script installing XCode's Command Line tools and use a series of try catch statements to call pip directly in my script. What I soon found out was that the modules I was installing weren't available to the script and my import commands were continuously failing.

#### So now what?

Well, why not load the modules directly. I'm only using 3 modules anyway... requests, xmltodict, and dicttoxml... it couldn't be that hard, could it? Googlefu had me up and running in little to no time with the requests module and I was able to make my API calls, but my scripts were failing as soon as I tried to parse the response.

What was happening... Well the xmltodict and dicttoxml modules were writing over 12 years ago and do not follow todays typical module structure. From what I can tell the two modules are stored as flat files. Where I was able to load requests using the ```LoadModuleFromPath``` method and the path ```'/Library/Python/3.8/site-packages/requests/__init__.py'```, I was unable to load xmltodict/dicttoxml using the same method with the two files stored as ```encoder.py``` and ```decoder.py```. The ```LoadModuleFromPath``` successfully loads both files but none of the class methods are available.

#### Time is running out

Here I am running out of time with a working script and no way to run it, banging my head against the wall I though of using ```brew```. Jumping from rabbit hole to rabbit hold I tried to get brew installed using a shell script, did I do it... no. I found that a non-interactive brew install doesn't appear to be possible with their master install script, and all the Googlefu led me to dead ends. The last chatter about silent installs from a script was when brew still used a ruby script and attempting the method myself the install would fail with an error telling me to use the new one.

#### Sometimes the easiest solution is going to be the best solution

The thought well what haven't I tried cross my mind, and the light bulb turned on in my brain. Why not install the official package directly, it was so obvious, but why hadn't I thought of this sooner? No time to dwell, I was about to be out of time. After deciding on this strategy, a couple minutes went by and I was in business.

Running in circles, I finally got my script working and the solution was way cleaner than my initial attempt. Dealing with a XCode Command Line Tools install or adds a variable I don't want to compensate for, not to mention the Python3 package is roughly 10% the size. And brew, it's great but it doesn't need to be installed across a production environment.

### Installing Python3 with BASH

I'm a little embarrassed to say this is about as easy as it gets.

```bash
# Download and install python3 if no previous install exists
if [[ ! -f /usr/local/bin/python3 ]]
then
	curl https://www.python.org/ftp/python/3.9.6/python-3.9.6-macos11.pkg -o /tmp/python3.9.pkg
	
	installer -pkg /tmp/python3.9.pkg -target /
	
	rm /tmp/python3.9.pkg
fi
```

### The Python Code

There's a couple ways to go about it so I will include both, you can either use a try catch statement or call pip3 every time.
The try catch method is a bit redundant because we can call ```subprocess.run()``` and not worry about the exit code causing a fatal error. I've also run into an issue where using ```pip3 uninstall``` on a module will cause ```import``` not to raise the ```ModuleNotFoundError```. So in general I'm going to call ```pip3 install``` every time to avoid issues.

```python
import subprocess
subprocess.run(['/usr/local/bin/python3', '-m', 'pip', 'install', 'requests'])
import requests

try:
	import xmltodict
except ModuleNotFoundError:
	subprocess.run(['/usr/local/bin/python3', '-m', 'pip', 'install', 'xmltodict'])
	import xmltodict
try:
	import dicttoxml
except ModuleNotFoundError:
	subprocess.run(['/usr/local/bin/python3', '-m', 'pip', 'install', 'dicttoxml'])
	import dicttoxml
```

### Running the Script

I think using a heardoc piped directly to the python binary is about as elegant of a solution as there can ever be.

```bash
/usr/local/bin/python3 << 'EOF'
<Your Script Goes Here>
EOF
```

### Bonus: Running the Script as a Daemon

Well, what if you don't want to fire your python script right then and there? Well, I've got you covered. I'm not going to lay out how to install daemons on macOS, there are plenty of resources out there, but I am going to gift you with the code. Also, I highly recommend using [Zerolaunchd](https://zerolaunched.herokuapp.com/) by [@zerowidth](https://zerowidth.com/) which will save a lot of time in creating our launch daemon plist.

```bash
ScriptPath='/usr/local/<ChooseDirectoryName>/<YourScript>.py'
# You can use cat or tee, I am using tee for verbosity.
# Make sure you include the '' around EOF, otherwise the shell will interpret any special characters
tee $ScriptPath << 'EOF'
<Your Script Goes Here>
EOF

# Set script permissions
chmod 744 $ScriptPath

LaunchDaemonPath='/Library/LaunchDaemons/com.<YourLaunchDaemon>.plist'
# Check for existing LaunchDaemons, if found stop and remove the service
if [[ -f $LaunchDaemonPath ]]
then
	launchctl bootout system $LaunchDaemonPath# Set script permissions
	rm /Library/LaunchDaemons/$LaunchDaemonPath
fi

# Create LaunchDaemon, start calendar interval is used as an example trigger.
# The most important lines to include are between ProgramArguments <Array></Array>
tee $LaunchDaemonPath << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>com.<YourLaunchDaemon>.daemon</string>
	<key>ProgramArguments</key>
	<array>
		<string>/usr/local/bin/python3</string>
		<string>$ScriptPath</string>
	</array>
	<key>StartCalendarInterval</key>
	<array>
		<dict>
			<key>Hour</key>
			<integer>21</integer>
			<key>Minute</key>
			<integer>15</integer>
		</dict>
	</array>
</dict>
</plist>
EOF

# Set daemon permissions, this redundant if your running the script as root but my be useful.
chmod 644 $LaunchDaemonPath
chown root:wheel $LaunchDaemonPath

# Start the daemon
launchctl bootstrap system $LaunchDaemonPath
```
