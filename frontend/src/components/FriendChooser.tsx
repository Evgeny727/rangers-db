import { MinusIcon, PlusSquareIcon } from '@chakra-ui/icons';
import { Flex, ButtonGroup, List, ListItem, Text } from '@chakra-ui/react';
import { forEach, map, flatMap, find } from 'lodash';
import { t } from '@lingui/macro';
import React, { useCallback, useMemo } from 'react';
import { GetProfileDocument, UserInfoFragment, UserProfileFragment } from '../generated/graphql/apollo-schema';
import ListHeader from './ListHeader';
import SubmitButton, { SubmitIconButton } from './SubmitButton';
import FriendSearch from './FriendSearch';
import FriendRequestsComponent from './FriendRequests';
import { SlMinus, SlPlus } from 'react-icons/sl';

interface Props {
  selection: string[];
  title: string;
  add: (id: string) => Promise<string | undefined>;
  remove?: (id: string) => Promise<string | undefined>;
  profile?: UserProfileFragment;
  refreshProfile: () => void;

}

function FriendRow({ add, remove, user }: {
  user: UserInfoFragment;
  add?: (id: string) => Promise<string | undefined>;
  remove?: (id: string) => Promise<string | undefined>;
}) {
  const onAdd = useCallback(async () => {
    if (add) {
      return await add(user.id);
    }
    return undefined;
  }, [add, user]);
  const onRemove = useCallback(async() => {
    if (remove) {
      return await remove(user.id);
    }
    return undefined;
  }, [remove, user]);
  return (
    <ListItem paddingTop={2} paddingBottom={2}>
      <Flex direction="row" alignItems="center" justifyContent="space-between">
        <Text paddingLeft={2} paddingRight={2}>{user.handle}</Text>
        <ButtonGroup>
          { !!add && <SubmitIconButton aria-label={t`Add`} onSubmit={onAdd} icon={<SlPlus/>} /> }
          { !!remove && <SubmitIconButton aria-label={t`Remove`} onSubmit={onRemove} icon={<SlMinus />} /> }
        </ButtonGroup>
      </Flex>
    </ListItem>
  );
}

export default function FriendChooser({ selection, title, add, remove, profile, refreshProfile }: Props) {
  const friendsById = useMemo(() => {
    const r: { [id: string]: UserInfoFragment | undefined } = {};
    forEach(profile?.friends, f => {
      if (f.user) {
        r[f.user.id] = f.user;
      }
    });
    return r;
  }, [profile]);
  return (
    <List>
      <ListHeader title={title} />
      { !!selection.length && (
        <>
          { flatMap(selection, id => {
            const friend = friendsById[id];
            if (!friend) {
              return null;
            }
            return (
              <FriendRow key={id} remove={remove} user={friend} />
            );
          })}
        </>
      ) }
      <FriendRequestsComponent
        profile={profile}
        removeIds={selection}
        refreshProfile={refreshProfile}
        friendActions={[{
          title: t`Add to campaign`,
          onPress: add,
          icon: 'add'
        }]}
      />
    </List>
  )
}