# Azure Event Grid - Example
This is an example repo of how to receive an event from Azure Event Grid in the Node runtime, handling AAD / MS Graph auth.

For some reason, there's no SDK for doing this, so I had to roll it semi-manually.

> NOTE: You cannot use Bun. Bun (<=1.0.36) doesn't implement `node:crypto`, and there's a sub-dependency that breaks without it.

## Setup
Azure has different ways to deliver events, but we're specifically using the Event Grid.

An Event Grid can send events to many things, but we're sending events to an HTTP endpoint, as it's more versatile than anything else.

An Event Grid can send events in 2 formats to an HTTP endpoint, and we're using the open standard [CloudEvents](https://learn.microsoft.com/en-us/azure/event-grid/concepts#cloudevents), as it's preferred and portable.

> We're using an open source tool called [SirTunnel](https://github.com/anderspitman/SirTunnel) for ssh tunneling

### Configure SSH Tunneling
1. In Azure, create a virtual machine (whatever the cheapest one is), and make sure to expose ports 22, 80, and 443
2. Click on the IP address of your VM and set a DNS name label (your domain name is now back on the homepage of the VM)
3. Add your public key under VM -> Reset Password. Make sure to select **Use existing public key**, and paste your public key
4. SSH into your VM, clone SirTunnel, add `sirtunnel.py` to the PATH, and run `run_server.sh`
```bash
$ ssh <ip of vm>
> git clone https://github.com/anderspitman/SirTunnel
> ln -s ./SirTunnel/sirtunnel.py ./.local/bin/sirtunnel.py
> cd SirTunnel
> ./run_server.sh
```
5. In another terminal on your local machine, create the tunnel on whatever port you want, using the domain name of your VM
```bash
$ ssh -tR 9001:localhost:<port> <ip> sirtunnel.py <domain name> 9001
```

### Azure Setup
1. In Azure, create an [Application Registration](https://learn.microsoft.com/en-us/graph/auth-register-app-v2#register-an-application) under an [Enterprise Application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/add-application-portal)
2. In Azure, create an [Event Grid Topic](https://learn.microsoft.com/en-us/azure/event-grid/custom-event-quickstart-portal#create-a-custom-topic) (just follow the Create a custom topic instructions, ignore the rest of the page, and choose a better name)

### Setup Local Project
1. Clone this repo, easy
2. Copy `example.env` to `.env`
```bash
git clone https://github.com/andrewschmidgit/aeg-subscriber-example.git
cp example.env .env
```
3. Set `CLIENT_ID` and `TENANT_ID` from the App Registration you created in [Azure Setup](#azure-setup) step 1
4. Set `PORT` to whatever you used back in [Configure SSH Tunneling](#configure-ssh-tunneling) step 5
5. Run `npm i`, then `npm run dev` to run the app
```bash
npm i
npm run dev
```

### Create Event Subscription
Upon creation of the subscription, Event Grid will send a validation request to our app, so every other step should be completed before this.

1. In Azure, on the Event Grid Topic you created earlier, create a new Event Subscription
2. Give it a name
3. For **Event Schema** select `Cloud Event Schema v1.0` 
4. For **Endpoint Type** select `Web Hook`
5. For **Endpoint**, paste in the domain of your VM, prepended by `https://`, and with `/event` at the end
> `https://<name>.<region>.cloudapp.azure.com/event`
6. Under *Additional Features*, check the `Use AAD authentication` box, and paste in your `TENANT_ID` and `CLIENT_ID` into **AAD Tenant ID** and **AAD Application ID or URI** respectively
7. Click **Create**

## Yay!
In the app's console, you should see the contents of the JWT printed out for you
