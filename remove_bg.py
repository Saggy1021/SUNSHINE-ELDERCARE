from PIL import Image
import collections
import sys

def remove_exterior_white(input_path, output_path, threshold=240):
    try:
        img = Image.open(input_path).convert("RGBA")
    except Exception as e:
        print(f"Failed to open {input_path}: {e}")
        return
        
    pixels = img.load()
    width, height = img.size
    
    q = collections.deque()
    visited = set()
    
    def is_white(c):
        return c[0] > threshold and c[1] > threshold and c[2] > threshold
        
    for x in range(width):
        if is_white(pixels[x, 0]):
            q.append((x, 0))
            visited.add((x, 0))
        if is_white(pixels[x, height-1]):
            q.append((x, height-1))
            visited.add((x, height-1))
            
    for y in range(height):
        if (0, y) not in visited and is_white(pixels[0, y]):
            q.append((0, y))
            visited.add((0, y))
        if (width-1, y) not in visited and is_white(pixels[width-1, y]):
            q.append((width-1, y))
            visited.add((width-1, y))
            
    while q:
        x, y = q.popleft()
        c = pixels[x, y]
        pixels[x, y] = (c[0], c[1], c[2], 0) # set alpha to 0
        
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                if is_white(pixels[nx, ny]):
                    visited.add((nx, ny))
                    q.append((nx, ny))
                    
    img.save(output_path, "PNG")
    print(f"Successfully processed {input_path} -> {output_path}")

remove_exterior_white("public/images/logo.jpg", "public/images/logo.png")
remove_exterior_white("public/images/emblem.jpg", "public/images/emblem.png")
