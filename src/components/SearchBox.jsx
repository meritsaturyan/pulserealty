import styled from 'styled-components';

const SearchContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  gap: 20px;
  align-items: flex-end;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Label = styled.label`
  font-size: 14px;
  color: #888;
  margin-bottom: 4px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const FilterLink = styled.a`
  display: flex;
  align-items: center;
  white-space: nowrap;
  color: #004085;
  font-weight: 500;
  font-size: 14px;
  text-decoration: none;
  margin-right: 10px;

  &::before {
    content: '≡';
    display: inline-block;
    margin-right: 6px;
  }
`;

const SearchButton = styled.button`
  background: #28a745;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
`;

const SearchBox = () => (
  <SearchContainer>
    <Field>
      <Label>Property</Label>
      <Input placeholder="Keywords.." />
    </Field>

    <Field>
      <Label>City/Street</Label>
      <Select>
        <option>Location</option>
      </Select>
    </Field>

    <Field>
      <Label>Property Type</Label>
      <Select>
        <option>Property Types</option>
      </Select>
    </Field>

    <FilterLink href="#">Advance Filter</FilterLink>
    <SearchButton>Search Property</SearchButton>
  </SearchContainer>
);

export default SearchBox;

