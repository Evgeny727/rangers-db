import React, { useCallback, useState, useMemo } from 'react';
import { Box, FormControl, Text, Flex, IconButton, Input, Spinner, List, ListItem } from '@chakra-ui/react';
import { t } from '@lingui/macro';
import { SearchIcon } from '@chakra-ui/icons';
import { forEach, map, trim } from 'lodash';

import { BasicUser, FriendAction, FriendLine } from './FriendRequests';
import { useSearchHandlesLazyQuery } from '../generated/graphql/apollo-schema';
import { ApolloError } from '@apollo/client';


function normalizeHandle(handle: string) {
  return trim(handle.replace(/[.$[\]#\/]/g, '_').toLowerCase());
}

function useSearchUsers(): (search: string) => Promise<SearchResults> {
  const [searchFriends, data] = useSearchHandlesLazyQuery({
    variables: {
      normalizedHandle: '',
      normalizedHandleStart: '',
    },
  });

  return useCallback(async(search: string) => {
    const normalizedSearch = normalizeHandle(search);
    const results = await searchFriends({
      variables: {
        normalizedHandle: `%${normalizedSearch}%`,
        normalizedHandleStart: `${normalizedSearch}%`,
      }
    });

    const users: BasicUser[] = [];
    forEach(results.data?.startMatch, (user) => {
      users.push({
        id: user.id,
        handle: user.handle || undefined,
      });
    });
    const alreadyFound = new Set(map(users, u => u.id));
    const fuzzyUsers: BasicUser[] = [];
    forEach(results.data?.looseMatch, (user) => {
      if (!alreadyFound.has(user.id)) {
        fuzzyUsers.push({
          id: user.id,
          handle: user.handle || undefined,
        });
      }
    });

    return {
      users,
      fuzzyUsers,
      hasMore: users.length === 20,
    };
  }, [searchFriends]);
}

interface SearchResults {
  users: BasicUser[];
  fuzzyUsers: BasicUser[];
  hasMore: boolean;
}
const EMPTY_ACTIONS: FriendAction[] = [];
export default function FriendSearch({ sendFriendRequest }: {
  sendFriendRequest: (userId: string) => Promise<string | undefined>;
  paddingLeft?: number;
}) {
  const [liveFriendRequests, setLiveFriendRequests] = useState<{[userId: string]: boolean | undefined}>({});
  const searchFriends = useSearchUsers();
  const sendRequest = useCallback(async (userId: string) => {
    const error = await sendFriendRequest(userId);
    if (error) {
      return error;
    }
    setLiveFriendRequests({
      ...liveFriendRequests,
      [userId]: true,
    });
    return undefined;
  }, [sendFriendRequest, liveFriendRequests, setLiveFriendRequests]);
  const friendActions: FriendAction[] = useMemo(() => {
    return [
      {
        title: t`Request friend`,
        onPress: sendRequest,
        icon: 'add',
      },
    ]
  }, [sendRequest])
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResults | undefined>();
  const [searchError, setSearchError] = useState<string | undefined>(undefined);
  const doSearch = useCallback(async () => {
    if (search.length < 2) {
      return;
    }
    setSearching(true);
    try {
      const data = await searchFriends(search);
    setResults(data);
    } catch (e) {
      if (e instanceof ApolloError) {
        setSearchError(e.message);
      } else {
        setSearchError('Unable to search users');
      }
    }
    setSearching(false);
  }, [search, setResults, searchFriends]);
  return (
    <Flex direction="column">
      <Box padding={2}>
        <form onSubmit={e => {
          e.preventDefault();
          doSearch();
        }}>
          <FormControl marginTop={2}>
            <Flex direction="row">
              <Input
                placeholder={t`Find new friends`}
                value={search}
                type="search"
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={e=> {
                  if (e.key === 'Enter') {
                    doSearch();
                    e.preventDefault();
                  }
                }}
              />
              { !!search && <IconButton marginLeft={2} aria-label='Search' onClick={doSearch} icon={<SearchIcon />} />}
            </Flex>
            { !!searchError && <Text margin={2} color="red.500">{searchError}</Text> }
          </FormControl>
        </form>
      </Box>
      <List>
        { searching && (
          <ListItem padding={2}>
            <Flex direction="row" justifyContent="center">
              <Spinner margin={2} size="md" />
            </Flex>
          </ListItem>
        ) }
        { !!results && (
          (results.users.length || results.fuzzyUsers.length) ? (
            <>
              { map(results.users, u => (
                <FriendLine key={u.id} user={u} actions={liveFriendRequests[u.id] ? EMPTY_ACTIONS : friendActions} />
              )) }
              { map(results.fuzzyUsers, u => (
                <FriendLine key={u.id} user={u} actions={liveFriendRequests[u.id] ? EMPTY_ACTIONS : friendActions} />
              )) }
            </>
          ) : (
            <ListItem paddingTop={2} paddingBottom={2}><Text>{t`No results`}</Text></ListItem>
        ))}
      </List>
    </Flex>
  )
}
