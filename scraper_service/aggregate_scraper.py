# Aggregate Scraper: Calls all source scrapers for a query
import sys
import traceback
results = []

# Try importing each scraper, set to None if import fails
try:
    from reddit_scraper import scrape_reddit
except Exception as e:
    scrape_reddit = None
    print(f"[ERROR] reddit_scraper import failed: {e}", file=sys.stderr)
try:
    from twitter_scraper import scrape_twitter
except Exception as e:
    scrape_twitter = None
    print(f"[ERROR] twitter_scraper import failed: {e}", file=sys.stderr)
try:
    from github_scraper import scrape_github
except Exception as e:
    scrape_github = None
    print(f"[ERROR] github_scraper import failed: {e}", file=sys.stderr)
try:
    from etsy_scraper import scrape_etsy
except Exception as e:
    scrape_etsy = None
    print(f"[ERROR] etsy_scraper import failed: {e}", file=sys.stderr)
try:
    from youtube_scraper import scrape_youtube
except Exception as e:
    scrape_youtube = None
    print(f"[ERROR] youtube_scraper import failed: {e}", file=sys.stderr)

# TODO: Add more sources (job boards, forums, etc.)

def aggregate_scrape(query):
    results = []
    # Each scraper is called only if import succeeded
    if scrape_reddit:
        try:
            results += scrape_reddit(query)
        except Exception as e:
            print(f"[ERROR] reddit_scraper failed: {e}\n{traceback.format_exc()}", file=sys.stderr)
    if scrape_twitter:
        try:
            results += scrape_twitter(query)
        except Exception as e:
            print(f"[ERROR] twitter_scraper failed: {e}\n{traceback.format_exc()}", file=sys.stderr)
    if scrape_github:
        try:
            results += scrape_github(query)
        except Exception as e:
            print(f"[ERROR] github_scraper failed: {e}\n{traceback.format_exc()}", file=sys.stderr)
    if scrape_etsy:
        try:
            results += scrape_etsy(query)
        except Exception as e:
            print(f"[ERROR] etsy_scraper failed: {e}\n{traceback.format_exc()}", file=sys.stderr)
    if scrape_youtube:
        try:
            results += scrape_youtube(query)
        except Exception as e:
            print(f"[ERROR] youtube_scraper failed: {e}\n{traceback.format_exc()}", file=sys.stderr)
    # TODO: Deduplicate, rank, and enrich results (AI)
    return results

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "treasure"
    import json
    print(json.dumps(aggregate_scrape(query), indent=2))
