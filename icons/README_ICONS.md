# Icons Placeholder

This extension requires three icon sizes:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

## Generating Icons

You can generate icons using any image editor or online tool. Here are some options:

### Option 1: Online Icon Generator
Visit https://www.favicon-generator.org/ and upload your logo

### Option 2: Using ImageMagick
```bash
# Create a simple icon with a robot emoji or gradient
convert -size 128x128 -background "#667eea" -fill white -gravity center \
  -font "DejaVu-Sans" -pointsize 80 label:"🤖" icon128.png

convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

### Option 3: Use an online tool
- Canva: https://www.canva.com/
- Figma: https://www.figma.com/
- Adobe Express: https://www.adobe.com/express/

## Temporary Workaround

For now, you can use any PNG images with the correct dimensions. The extension will still work without proper icons, but they won't look as professional in the browser.

## Recommended Design

- Use the gradient colors: #667eea to #764ba2
- Include a robot or AI-related symbol
- Keep it simple and recognizable at small sizes
- Use a transparent or white background
