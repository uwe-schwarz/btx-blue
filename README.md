# BTX Blue

## Cloudflare Deployment

This project is configured for Cloudflare Workers Static Assets via [`wrangler.jsonc`](./wrangler.jsonc).

1. Authenticate once with `pnpm wrangler login` or provide `CLOUDFLARE_API_TOKEN`.
2. Build and deploy with `pnpm deploy`.
3. Preview the built site with Cloudflare's local runtime via `pnpm cf:dev`.

The Wrangler config attaches the deployment to the custom domain `btx.blue`. The domain must be in the same Cloudflare account, and any conflicting DNS record for `btx.blue` should be removed before the first deploy so Wrangler can create the custom-domain binding.

## Asset Generation

The favicon variants and the Open Graph image are derived from [`public/fav.png`](./public/fav.png).

The Open Graph image was built from the repo root with ImageMagick like this:

```sh
magick public/fav.png -transparent black public/fav-t.png

magick -size 1200x630 gradient:'#020612-#03177d' \
  \( -size 1200x630 xc:none -fill 'rgba(12,23,96,0.55)' -draw 'rectangle 72,72 1128,558' \) -composite \
  \( public/fav-t.png -filter point -define filter:blur=0 -resize 430x430 \) -gravity west -geometry +120+0 -composite \
  \( -size 1200x630 xc:none -stroke '#1634b9' -strokewidth 6 -fill none -draw 'rectangle 74,74 1126,556' \) -composite \
  -font public/fonts/bedstead.otf -fill '#f4f7ff' -pointsize 150 -gravity northwest -annotate +600+120 'Uwe' \
  -font public/fonts/bedstead.otf -fill '#89ffff' -pointsize 100 -gravity northwest -annotate +600+290 'btx.blue' \
  -fill '#ffef73' -draw 'rectangle 600,450 1000,462' \
  -fill '#85a4ff' -draw 'rectangle 600,490 920,502' \
  public/og-image.png

rm public/fav-t.png
```
