from PIL import Image

def remove_white_bg(input_path, output_path):
    print(f"Opening {input_path}")
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # Any pixel that is mostly white gets transparent
    for item in datas:
        if item[0] > 245 and item[1] > 245 and item[2] > 245:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

remove_white_bg(
    r"C:\Users\sagni\.gemini\antigravity-ide\brain\e3c65507-c2b9-48f1-9108-c7738c9bcfee\.user_uploaded\media_1789143397002.jpg", 
    r"c:\Users\sagni\Downloads\yoga-website-design\public\images\logo-new.png"
)
