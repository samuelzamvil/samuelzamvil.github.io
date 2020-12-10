# Using a Raspberry pi and the Truenas v2 REST API to Auto-Unlock a Passphrase Encrypted Dataset at Startup


* [Introduction](#introduction)
* [Accessing the API](#accessing-the-api)
    * [Using an API Key](#using-an-api-key)
    * [Using Basic Auth](#using-basic-auth)
    * [Testing Access](#testing-access)
* [Building our API Call](#building-our-api-call)
* [Configuring Auto-Unlock](#configuring-auto-unlock)

---

#### Credits to user ScubaMatt on the Lawrance Systems forum for coming up with a method for automatically decrypting a legacy encrypted pool. This setup will partially follow his setup instructions and rely on some of the scripts he wrote. 
##### [https://forums.lawrencesystems.com/t/freenas-automatic-decryption-on-boot/2586/5](https://forums.lawrencesystems.com/t/freenas-automatic-decryption-on-boot/2586/5)

### Introduction

One thing that has been a pain point for me using the encryption in FreeNAS/TrueNAS has been the automatic decryption of encrypted datasets. The problem being, is my usecase for encryption is a desire to protect my data from physical theft. Thankfully the user <b>ScubaMatt</b> on the LawrenceSystems forums came up with a solution and comprehensive write up.

I've been using his solution of using a pi-zero that holds a ZFS pool recovery key inside a LUKS container, where the containers password is contained on the FreeNAS server. In the solution both systems can only unlock what resides on the other and must be available to unlock the drive at boot. So in the event of a theft, a robber would need to find and grab the server along with the raspberrypi to have access to the encrypted data.

I decided to write this blog post after finding the need to reinvent the previous solution to work with latest version of TrueNAS dataset encryption. It took quite a bit of effort to understand what was expected from the v2 API in order to get it to work. After going through this effort I figured others could benefit from an explanation and solution. There honestly might have been a better way but I couldn't track it down in the documentation.

#### <font color=red>Disclaimer</font>

I will not be held responsible for any data lost as a result of encrypting your dataset. Please backup your passphrase and make sure you have a copy somewhere safe.

None of the commands or scripts contained here come with any warranty.

The few lines from the python script <a href="https://github.com/freenas/freenas/blob/master/src/middlewared/middlewared/plugins/pool.py">pool.py</a> is copyright of iXsystems and may be removed without warning.

### Accessing the API

First things first we have to be authorized to access the API, this can be done in a couple of ways, using either basic authentication which uses a username and password or by creating and API key. I'm using Postman to test with but all of my examples are in cURL give examples in cURL because that's what we'll inevitably using for the auto unlock script.

##### Using an API Key
This is documented well in the <a href="https://www.truenas.com/docs/hub/additional-topics/api/">API V2 documentation</a> so I won't duplicate efforts here.

To prevent having the key reside in your console history run the following command and paste the `API Key` you created at the prompt.
```bash
echo -n "APIKEY="; APIKEY=`read -r -s -e`
```
We can now use the API key in our web requests by adding the following to cURL, `--header "Authorization: Bearer $APIKEY"`.

##### Using Basic Auth

This is a bit more involved because you will need to encode you username and password in Base64. To do we'll run several commands which will read in our username and password to avoid them showing in our console history, and then encode it for transport.

In BASH or z-shell run the following.
```bash    
echo -n "Username="; USER=`read -r -e`
echo -n "Password="; PASS=`read -r -s -e`
USERPASS=$(echo -n "$USER:$PASS" | iconv -t ISO-8859-1 | base64 -i -)
```
We now have our basic auth password saved as a variable, which we will add to cURL. `--header "authorization: Basic $USERPASS"`

You will also want to print the output of $USERPASS using `echo` and save for use in our script later.
```bash
echo $USERPASS
```

Please note that we are not exporting these variables anywhere so everytime you open a new shell you will need to go through the previous commands. Later on we will be adding this information to our luks container located on our remote machine.

##### Testing Access

I like to try and test while also getting some usable information for the unlock script we'll be creating later on. To do this we will call cURL with the headers we just created, making a `GET` request to the `'https://<TrueNAS Host>/api/v2.0/pool/dataset'`. Because this request will give us way more information than we need we will use `head -n 3` to restrict our results to the top 3 lines.
Also, you may need to use the `--insecure` flag in order to get a response. This is required for me because my server uses a self-signed certificate, which is the default for FreeNAS/TrueNAS. I am also using the `-s` argument in cURL to enable silent operation, removing this flag may be necessary to troubleshooting.
```bash
curl --location --request GET <Authorization Header from Previous Step>  --url 'https://<TrueNAS Host>/api/v2.0/pool/dataset/' --insecure -s | head -n 5
```
### Building our API Call

##### This next section explains how to read the python code to understand what wasn't explained by the documentation. The information contained below is not ansilary to the operation of auto-unlock, so feel free to skip ahead to the last section of Building our API Call.

Using the <a href="https://www.truenas.com/docs/hub/additional-topics/api/rest_api/">V2 REST API</a> documentation, we establish that we will need to use the <b>poolDatasetUnlockPost</b> which uses the following URI `/pool/dataset/unlock` and expects JSON payload. Unfortunately, understanding the payload schema can quickly became troublesome. The API documenation specifies that we need to supply an `id` and `unlock_options.datasets` which to me is ambiguous. Ontop of this, as long as you include `id` and `unlock_options` the API wouldn't return any helpful troubleshooting information, each response is a number that increased which each subsequent call. I'm not sure if this is a design choice or if there is a way to enable debug responses.

Thankfully, we are able to view the source on our TrueNAS device or on the FreeNAS github page. The file that contain the method responsible for handling our API call `def unlock` can be found at `/usr/local/lib/python3.8/site-packages/middlewared/plugins/pool.py` or at [https://github.com/freenas/freenas/blob/master/src/middlewared/middlewared/plugins/pool.py#L2259](https://github.com/freenas/freenas/blob/master/src/middlewared/middlewared/plugins/pool.py#L2259).

I will be referencing the sourcecode, however, I am refraining from posting a lengthy excerpt here to avoid any legal ramifications.

---

As we can see at...
```python
def unlock(self, job, id, options):
```
the `unlock` method is passed `id` and `options`, so we have to include both separately and this is where things start to get confusing.

Looking at...
```python
for i, ds in enumerate(options['datasets']):
```
 we can see that we call `enumerate` on `options['dataset']`, and in the subsequent line...
 ```python
 keys_supplied[ds['name']] = ds.get('key') or ds.get('passphrase')
 ```
 we see that values in `ds` are being access by using a key and the `.get()` method. What this tells us, is that what we enumerated in `dataset` contains a dictionary. However, if `dataset` itself was a dictionary, calling the enumerate method on the it would only return the dictionary keys as strings, and since we know there's an object in `dataset` that's a dictionary, `dataset` would have to be a `list` and it's `0` index contains a `dict`.

In short we have found the following schema so far `options<dict>['datasets']<list>[0]<dict>`.

Finally, looking at...
```python
keys_supplied[ds['name']] = ds.get('key') or ds.get('passphrase')
```
we can see that the key `name` gets assigned to the `keys_supplied` `dict` with the value of either  `dataset[0][key]` or `dataset[0][passphrase]`. So we know that `dataset[0]` needs to contain both `name` and `passphrase`.

---
This is now enough data to formulate our payload, and we end up with the following.
```json
{ 
    "id": "<Dataset ID>",
    "unlock_options": {
        "datasets": [{
        "name": "<Dataset Name>",
        "passphrase": "<Password>"
        }]
    }
}
```

To test this call we will lock our dataset in the TrueNAS GUI under Pools then run the following in cURL and refresh the page. Once again, I will be saving the passphrase using `read` to avoid it showing in my console history and using the `--insecure` flag to bypass SSL verification.
```bash
echo -n "Passphrase="; PASSPHRASE=`read -r -s -e`
curl --location --request POST 'https://<TrueNAS Host>/api/v2.0/pool/dataset/unlock' \
    --header 'Content-Type: application/json' \
    <Authorization Header Goes Here> \
    --data-raw "{ 
        \"id\": \"<Dataset ID>\",
        \"unlock_options\": {
            \"datasets\" : [{
            \"name\": \"<Dataset Name>\",
            \"passphrase\": \"$PASSPHRASE\"
            }]
        }
    }"
```
### Configuring Auto-Unlock

To avoid duplication of efforts we will be setting up SSH and the LUKS containter and scripts using <b>ScubaMatt's</b> guide <A href="https://forums.lawrencesystems.com/t/freenas-automatic-decryption-on-boot/2586/5">here</A>.

---
Follow <b>ScubaMatt's</b> guide up to the point he mentions adding your recovery key to `/mnt/secure`. At this point we will be doing a couple things differently.

Using your text editor of choice create the file `/mnt/secure/authorization` using the arguments we used to test our server earlier. The format for the textfile will either be `Authorization: Basic <Output of USERPASS Variable>` or `Authorization: Bearer <Your API Key>`.

Create another text file at `/mnt/secure/passphrase` including your dataset's passphrase.

Once you have finished creating both text files, continue through <b>ScubaMatts</b> guide <b>completely ignoring Step 4</b>.

-----
Now that you have completed <b>ScubaMatt's</b> guide while <b>ignoring Step 4</b> we will now continue.

Thankfully decrypting a dataset doesn't require a key file so we can skip using python all together, simplify the `/root/auto-mount/auto-mount.sh` script, and remove the need for a RAMdisk.

Create the file `/root/auto-mount/auto-mount.sh` copying the script below while filling in everything enclosed in `<>` brackets.

```bash
#!/bin/bash

# Send our unlock/mount script to the pi and execute it on the pi using ssh
ssh <username@raspberrypi_IP_Address> 'bash -s' < /root/auto-mount/pi-mount-secure.sh

# POST unlock command with the contents of key file on raspberrypi
curl --insecure --location --request POST 'https://127.0.0.1/api/v2.0/pool/dataset/unlock' \
--header 'Content-Type: application/json' \
--header `ssh -t <username@raspberrypi_IP_Address> 'cat /mnt/secure/authorization' | tr -cd "[:print:]"` \
--data-raw "{
    \"id\": \"<Dataset ID>\",
    \"unlock_options\": {
        \"datasets\": [{
        \"name\": \"<Dataset Name>\",
        \"passphrase\": \"`ssh -t <username@raspberrypi_IP_Address> 'cat /mnt/secure/passphrase' | tr -cd "[:print:]"`\"
    	}]
    }
}"

# Send our unmount/lock script to the pi and execute it on the pi using ssh
ssh <username@raspberrypi_IP_Address> 'bash -s' < /root/auto-mount/pi-unmount-secure.sh

# Finally, now that the pools have been unlocked lets restart Samba
# (This is the only service I use, but you might need to restart others on your setup.)
service samba_server restart

# 30 second buffer to wait for dataset to fully unlock before attemption to start jails
sleep 30

#Start jails
iocage start <Jail Name>
```

Once the `/root/auto-mount/auto-mount.sh` file is created we will need to make this executable using command below.
```
chmod +x /root/auto-mount/auto-mount.sh
```
We can finally test our script. Lock your dataset using the web console and run our `auto-mount.sh` script. If it was successfull go ahead and restart your server to test that the init task you setup in <b>ScubaMatt's</b> guide has been setup correctly.