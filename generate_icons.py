from PIL import Image, ImageDraw, ImageFont

# Create a simple icon with "10K" text
sizes = [(32, 32), (128, 128), (256, 256)]

for size in sizes:
    # Create image with black background
    img = Image.new('RGB', size, color='black')
    draw = ImageDraw.Draw(img)
    
    # Draw white circle
    margin = size[0] // 10
    draw.ellipse([margin, margin, size[0]-margin, size[1]-margin], fill='white')
    
    # Draw "10K" text (simple - no font needed)
    text_size = size[0] // 4
    text = "10K"
    
    # Save
    if size == (32, 32):
        img.save('src-tauri/icons/32x32.png')
    elif size == (128, 128):
        img.save('src-tauri/icons/128x128.png')
        img.save('src-tauri/icons/128x128@2x.png')
    elif size == (256, 256):
        img.save('src-tauri/icons/icon.png')
        # Save as ICO for Windows
        img.save('src-tauri/icons/icon.ico', format='ICO', sizes=[(256, 256)])

print("Icons created successfully!")
