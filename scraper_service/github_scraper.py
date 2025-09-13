# GitHub Scraper Example
# Requires: pip install requests
import requests

def scrape_github(query, limit=5):
    url = f'https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page={limit}'
    
    # Optional: Add your GitHub token for higher rate limits
    headers = {'Authorization': 'token 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'}
    resp = requests.get(url, headers=headers)
    
    results = []
    for repo in resp.json().get('items', []):
        results.append({
            'title': repo['name'],
            'description': repo['description'] or '',
            'link': repo['html_url'],
            'source': 'GitHub'
        })
    return results

# Example usage:
if __name__ == '__main__':
    print(scrape_github('ttu'))

# INSTRUCTIONS: Get your token at https://github.com/settings/tokens
