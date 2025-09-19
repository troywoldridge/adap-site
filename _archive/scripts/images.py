import requests
import csv

# Set your Cloudflare credentials
ACCOUNT_ID = "720ec85be65a483a3e34400d56dba5d8"
API_TOKEN = "863F5Vnj0Und-z2pV6SXdlIvzZ4S84Z9IeGqQ5Ef"
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}"
}

def get_all_images():
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/images/v1"
    images = []

    page = 1
    while True:
        response = requests.get(url, headers=HEADERS, params={"page": page})
        data = response.json()

        if not data["success"]:
            raise Exception("Failed to fetch images", data["errors"])

        results = data["result"]["images"]
        if not results:
            break

        for img in results:
            images.append({
                "cloudflare_id": img["id"],
                "filename": img.get("filename", ""),
                "variant": "public",
                "alt": img.get("meta", {}).get("alt", "")
            })

        page += 1

    return images

def write_csv(images, csv_path="cloudflare_images.csv"):
    with open(csv_path, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["cloudflare_id", "filename", "variant", "alt"])
        writer.writeheader()
        for img in images:
            writer.writerow(img)

if __name__ == "__main__":
    imgs = get_all_images()
    write_csv(imgs)
    print(f"✅ Wrote {len(imgs)} image records to cloudflare_images.csv")
