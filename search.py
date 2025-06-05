import os
import re
from pathlib import Path
from typing import List, Set
from dataclasses import dataclass

@dataclass
class SearchResult:
    file_path: str
    line_number: int
    line_content: str
    matched_word: str

class AutoFileSearcher:
    def __init__(self,
                 root_dir: str,
                 search_words: List[str],
                 file_extensions: Set[str] = set(),
                 exclude_folders: Set[str] = set(),
                 whole_word: bool = True):  # Added whole_word parameter
        # Initialize with search directory, words to find, and file types to search
        self.root_dir = root_dir
        self.search_words = search_words
        self.file_extensions = file_extensions or {'.txt', '.py', '.js', '.html', }
        self.exclude_folders = exclude_folders or {'node_modules', 'venv', '.git', '_locales' ,''}
        self.whole_word = whole_word

        # Run search automatically upon creation
        self.run_search()

    def should_skip_folder(self, folder_name: str) -> bool:
        """Check if a folder should be skipped based on exclusion rules"""
        return folder_name in self.exclude_folders

    def run_search(self):
        """Automatically run the search and display results"""
        print(f"\nSearching in directory: {self.root_dir}")
        print(f"Looking for words: {', '.join(self.search_words)}")
        print(f"In file types: {', '.join(self.file_extensions)}")
        print(f"Excluding folders: {', '.join(self.exclude_folders)}")
        print(f"Whole word matching: {'Yes' if self.whole_word else 'No'}")
        print("\nResults:")
        print("-" * 50)

        results = self.search_files()
        self.print_results(results)

    def search_files(self) -> List[SearchResult]:
        """Search for the specified words in all matching files"""
        results = []

        # Create patterns for each search word
        patterns = []
        for word in self.search_words:
            if self.whole_word:
                # \b represents a word boundary in regex
                pattern = rf'\b{re.escape(word)}\b'
            else:
                pattern = re.escape(word)
            patterns.append(re.compile(pattern, re.IGNORECASE))

        # Walk through all directories and subdirectories
        for root, dirs, files in os.walk(self.root_dir):
            # Remove excluded folders from dirs list to prevent walking into them
            dirs[:] = [d for d in dirs if not self.should_skip_folder(d)]

            for file in files:
                file_path = Path(root) / file

                # Check if the file has one of our target extensions
                if file_path.suffix.lower() in self.file_extensions:
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            # Search each line in the file
                            for line_num, line in enumerate(f, 1):
                                for pattern in patterns:
                                    matches = pattern.finditer(line)
                                    for match in matches:
                                        results.append(SearchResult(
                                            file_path=str(file_path),
                                            line_number=line_num,
                                            line_content=line.strip(),
                                            matched_word=match.group()
                                        ))
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")

        return results

    def print_results(self, results: List[SearchResult]):
        """Display search results in a clear format"""
        if not results:
            print("No matches found!")
            print("\nPossible reasons:")
            print("1. The search words might not exist in any files")
            print("2. The files might have different extensions than what we're searching")
            print("3. The files might be in a different directory")
            print("4. The files might be in excluded folders")
            print("\nCurrent settings:")
            print(f"- Search directory: {self.root_dir}")
            print(f"- File types being searched: {', '.join(self.file_extensions)}")
            print(f"- Words being searched: {', '.join(self.search_words)}")
            print(f"- Excluded folders: {', '.join(self.exclude_folders)}")
            print(f"- Whole word matching: {'Yes' if self.whole_word else 'No'}")
        else:
            print(f"Found {len(results)} matches:")
            current_file = None

            for result in results:
                # Print file header only when we move to a new file
                if current_file != result.file_path:
                    current_file = result.file_path
                    print(f"\nFile: {result.file_path}")

                print(f"Line {result.line_number}: {result.line_content}")
                print(f"Matched word: {result.matched_word}")
                print("-" * 50)

# Example usage - this runs automatically when the program starts
if __name__ == "__main__":
    # Set up your search configuration here
    SEARCH_DIRECTORY = "."  # Current directory, change this to your target folder
    SEARCH_WORDS = [input()]  # Words to search for
    FILE_TYPES =  { '.css', '.html','.js','.ts','.tsx', '.less',} # File types to search in
    EXCLUDE_FOLDERS = {'node_modules', 'venv', '.github', '__pycache__', 'dist' ,'ext' , 'docs' , 'bundles' ,'_locales','tests','build'}  # Folders to skip
    WHOLE_WORD = False  # Set to True to match whole words only

    # Create the searcher - it will run automatically
    searcher = AutoFileSearcher(
        root_dir=SEARCH_DIRECTORY,
        search_words=SEARCH_WORDS,
        file_extensions=FILE_TYPES,
        exclude_folders=EXCLUDE_FOLDERS,
        whole_word=WHOLE_WORD
    )