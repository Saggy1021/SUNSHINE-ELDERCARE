from PIL import Image, ImageDraw

def make_circular_transparent(img_path, out_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        w, h = img.size
        
        # Create a blank 8-bit black image
        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)
        
        # Draw a white ellipse. We inset it slightly to remove any border artifacts
        # Assuming the emblem is a perfect circle centered in the square image.
        inset = int(w * 0.02)
        draw.ellipse((inset, inset, w - inset, h - inset), fill=255)
        
        # Apply the mask to the alpha channel
        img.putalpha(mask)
        img.save(out_path, "PNG")
        print(f"Successfully applied circular mask to {img_path} -> {out_path}")
    except Exception as e:
        print(f"Error processing {img_path}: {e}")

make_circular_transparent("public/images/emblem.jpg", "public/images/emblem.png")
