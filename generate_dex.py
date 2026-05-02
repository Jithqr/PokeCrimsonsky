import requests
import csv

def generate_pokemon_file():
    print("Fetching data from PokéAPI...")
    # This endpoint grabs all base Pokémon AND all their alternate forms/Megas at once
    response = requests.get("https://pokeapi.co/api/v2/pokemon?limit=10000")
    data = response.json()

    filename = "pokemon_all_forms.csv"
    
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["ID", "Name", "Category", "API_URL"])
        
        for p in data["results"]:
            name = p["name"]
            url = p["url"]
            # PokéAPI IDs for base forms are 1-1025. Alternate forms/Megas start at 10001.
            poke_id = int(url.split("/")[-2]) 
            
            # Categorize the form
            category = "Base Form"
            if "-mega" in name:
                category = "Mega Evolution"
            elif "-primal" in name:
                category = "Primal Reversion"
            elif "-gmax" in name:
                category = "Gigantamax"
            elif "-alola" in name or "-galar" in name or "-hisui" in name or "-paldea" in name:
                category = "Regional Form"
            elif poke_id > 10000:
                category = "Alternate Form"

            # Clean up the name for the file (e.g., "deoxys-attack" -> "Deoxys-Attack")
            clean_name = name.replace("-", " ").title()
            
            writer.writerow([poke_id, clean_name, category, url])

    print(f"Success! Saved all forms to {filename}")

if __name__ == "__main__":
    generate_pokemon_file()
