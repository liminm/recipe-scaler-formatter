from PIL import Image
import sys

def remove_checkered_background(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # The checkered pattern usually consists of white and light gray squares.
    # We'll define a threshold to identify these "background" colors.
    # Common gray in checkers is around (204, 204, 204) or similar.
    
    # Let's be aggressive: anything that is white or very light gray, OR the specific checker gray.
    
    for item in datas:
        # item is (R, G, B, A)
        r, g, b, a = item
        
        # Check for white (255, 255, 255)
        if r > 250 and g > 250 and b > 250:
            newData.append((255, 255, 255, 0)) # Transparent
        # Check for the light gray checker square (often around 204-240)
        # We check if R, G, and B are close to each other (gray) and within a certain brightness range
        elif r > 200 and g > 200 and b > 200 and abs(r-g) < 10 and abs(g-b) < 10:
             newData.append((255, 255, 255, 0)) # Transparent
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent image to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input> <output>")
    else:
        remove_checkered_background(sys.argv[1], sys.argv[2])
