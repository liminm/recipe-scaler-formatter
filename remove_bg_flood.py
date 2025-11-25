from PIL import Image
import sys

def remove_background_flood(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    width, height = img.size
    pixels = img.load()

    # Visited set to keep track of processed pixels
    visited = set()
    
    # Queue for BFS: (x, y)
    queue = []
    
    # Start from all four corners
    corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    
    for x, y in corners:
        queue.append((x, y))
        visited.add((x, y))

    # Define "Dark" threshold. The outline is brown/black.
    # We want to remove anything that is NOT dark (i.e., the white/gray checkers).
    # A pixel is "background" if it is light.
    def is_background(r, g, b):
        # Checkers are usually > 200 brightness.
        # The outline is usually < 150.
        return (r + g + b) / 3 > 180

    while queue:
        x, y = queue.pop(0)
        
        r, g, b, a = pixels[x, y]
        
        # If this pixel is "light" (background), make it transparent
        if is_background(r, g, b):
            pixels[x, y] = (0, 0, 0, 0)
            
            # Add neighbors
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))

    img.save(output_path, "PNG")
    print(f"Saved flood-filled image to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg_flood.py <input> <output>")
    else:
        remove_background_flood(sys.argv[1], sys.argv[2])
