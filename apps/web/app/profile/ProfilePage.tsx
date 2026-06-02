"use client";

import type {
  ProfileTheme,
  UpdateProfileRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";
import { LanguageSelector } from "../components/i18n/LanguageSelector";
import { AppHeader } from "../components/layout/AppHeader";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import {
  deleteProfileAvatar,
  fetchProfile,
  resolveAvatarUrl,
  updateProfile,
  uploadProfileAvatar,
} from "../lib/profile-api";
import { getUserInitials } from "../lib/profile-display";

const profileQueryKey = ["profile"] as const;

interface ProfileFormState {
  firstName: string;
  lastName: string;
  nickname: string;
  theme: ProfileTheme;
}

const initialFormState: ProfileFormState = {
  firstName: "",
  lastName: "",
  nickname: "",
  theme: "system",
};

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { accessToken, updateUser } = useAuth();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => fetchProfile(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setForm({
      firstName: profileQuery.data.firstName ?? "",
      lastName: profileQuery.data.lastName ?? "",
      nickname: profileQuery.data.nickname ?? "",
      theme: profileQuery.data.theme ?? "system",
    });
  }, [profileQuery.data]);

  const onMutationSuccess = (profile: UserDto, message: string) => {
    queryClient.setQueryData(profileQueryKey, profile);
    updateUser(profile);
    setClientError(null);
    setServerError(null);
    setSuccessMessage(message);
  };

  const onMutationStart = () => {
    setClientError(null);
    setServerError(null);
    setSuccessMessage(null);
  };

  const onMutationError = (message: string) => {
    setServerError(message);
  };

  const updateMutation = useMutation({
    mutationFn: (input: UpdateProfileRequest) =>
      updateProfile(accessToken ?? "", input),
    onMutate: onMutationStart,
    onError: () => onMutationError(t.profileSaveError),
    onSuccess: (profile) => onMutationSuccess(profile, t.profileSaved),
  });

  const uploadMutation = useMutation({
    mutationFn: (avatar: File) => uploadProfileAvatar(accessToken ?? "", avatar),
    onMutate: onMutationStart,
    onError: () => onMutationError(t.photoUpdateError),
    onSuccess: (profile) =>
      onMutationSuccess(profile, t.photoUpdated),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProfileAvatar(accessToken ?? ""),
    onMutate: onMutationStart,
    onError: () => onMutationError(t.photoDeleteError),
    onSuccess: (profile) =>
      onMutationSuccess(profile, t.photoDeleted),
  });

  const profile = profileQuery.data;
  const isSaving =
    updateMutation.isPending ||
    uploadMutation.isPending ||
    deleteMutation.isPending;
  const errorMessage = clientError ?? serverError;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateMutation.mutate({
      firstName: textOrNull(form.firstName),
      lastName: textOrNull(form.lastName),
      nickname: textOrNull(form.nickname),
      theme: form.theme,
    });
  };

  const onAvatarSelected = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setClientError(t.invalidPhoto);
      setServerError(null);
      setSuccessMessage(null);
      return;
    }

    setClientError(null);
    uploadMutation.mutate(file, {
      onSettled: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  return (
    <main>
      <AppHeader />

      <header>
        <p className="eyebrow">{t.accountSettings}</p>
        <h1>{t.userProfile}</h1>
        <p className="subtitle">{t.profileSubtitle}</p>
      </header>

      {profileQuery.isLoading ? (
        <p>{t.loadingProfile}</p>
      ) : profileQuery.error instanceof Error ? (
        <p className="error-text">{t.profileLoadError}</p>
      ) : profile ? (
        <div className="profile-layout">
          <Card>
            <CardHeader>
              <h2>{t.profilePhoto}</h2>
              <p>{t.profilePhotoHelp}</p>
            </CardHeader>
            <CardContent className="profile-avatar-content">
              <Avatar
                alt={profile.nickname ?? profile.name}
                fallback={getUserInitials(profile)}
                src={resolveAvatarUrl(profile.avatarUrl)}
              />
              <div className="profile-avatar-actions">
                <Input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => onAvatarSelected(event.target.files?.[0])}
                  disabled={isSaving}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  {uploadMutation.isPending ? t.uploading : t.uploadOrChangePhoto}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => deleteMutation.mutate()}
                  disabled={isSaving || !profile.avatarUrl}
                >
                  {deleteMutation.isPending ? t.deleting : t.deletePhoto}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2>{t.personalInformation}</h2>
              <p>{t.googleEmailHelp}</p>
            </CardHeader>
            <CardContent>
              <form className="profile-form" onSubmit={onSubmit}>
                <div className="profile-field profile-field-full">
                  <Label htmlFor="email">{t.email}</Label>
                  <Input id="email" value={profile.email} disabled readOnly />
                </div>
                <div className="profile-field">
                  <Label htmlFor="first-name">{t.firstName}</Label>
                  <Input
                    id="first-name"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    maxLength={100}
                    disabled={isSaving}
                  />
                </div>
                <div className="profile-field">
                  <Label htmlFor="last-name">{t.lastName}</Label>
                  <Input
                    id="last-name"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    maxLength={100}
                    disabled={isSaving}
                  />
                </div>
                <div className="profile-field profile-field-full">
                  <Label htmlFor="nickname">{t.nickname}</Label>
                  <Input
                    id="nickname"
                    value={form.nickname}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nickname: event.target.value,
                      }))
                    }
                    maxLength={50}
                    disabled={isSaving}
                  />
                </div>
                <div className="profile-field">
                  <LanguageSelector id="profile-language" showLabel disabled={isSaving} />
                </div>
                <div className="profile-field">
                  <Label htmlFor="theme">{t.themePreference}</Label>
                  <Select
                    id="theme"
                    value={form.theme}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        theme: event.target.value as ProfileTheme,
                      }))
                    }
                    disabled={isSaving}
                  >
                    <option value="light">{t.light}</option>
                    <option value="dark">{t.dark}</option>
                    <option value="system">{t.system}</option>
                  </Select>
                </div>
                <div className="profile-form-footer profile-field-full">
                  <Button type="submit" disabled={isSaving}>
                    {updateMutation.isPending ? t.saving : t.saveChanges}
                  </Button>
                  {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
                  {successMessage ? (
                    <p className="success-text">{successMessage}</p>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
