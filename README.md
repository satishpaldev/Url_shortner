# Shortly URL shortener

## Run locally

1. Install Node.js 20 or newer.
2. Open PowerShell in this folder and run `node server.js`.
3. Open [http://localhost:3000](http://localhost:3000).
4. Paste a full `https://` or `http://` address and choose **Shorten link**.

The resulting link (for example, `http://localhost:3000/summer-collection`) redirects to its destination. Locally, links and click counts are stored in `links.json` beside the server file. `python -m http.server` only serves static files and cannot create redirects.

## Deploy on Render

The included `render.yaml` configures a Render web service. Push this repository to GitHub, sign in to [Render](https://render.com), choose **New → Blueprint**, connect the repository, and deploy the `shortly-url-shortener` service. Render supplies the public HTTPS URL; generated short links use that URL automatically.

The free Render service uses an ephemeral filesystem, so `links.json` can be erased when the service restarts or redeploys. Free instances can also spin down while idle. This setup is suitable for a demo, but it does not promise permanent links. For persistence, attach a paid Render disk mounted at `/var/data` and set the service environment variable `SHORTLY_DATA_DIR` to `/var/data`, or move storage to a database. Render bills persistent disks separately, and disks require a paid web service.

These steps require your own GitHub and Render accounts. Do not commit `links.json`; it is ignored by `.gitignore`.
