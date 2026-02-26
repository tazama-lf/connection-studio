import React from 'react';
import { SearchIcon } from 'lucide-react';
interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}
 const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  placeholder = 'Search...'
}) => <div className="relative w-full md:w-80" data-id="element-1088">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" data-id="element-1089">
        <SearchIcon size={18} className="text-gray-400" data-id="element-1090" />
      </div>
      <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder={placeholder} value={searchTerm} onChange={e => { setSearchTerm(e.target.value); }} data-id="element-1091" />
    </div>;

export default SearchBar;