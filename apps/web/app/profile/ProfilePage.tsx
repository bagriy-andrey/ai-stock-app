"use client";

import type {
  ProfileLanguage,
  ProfileTheme,
  UpdateProfileRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../components/auth/AuthProvider";
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

const profileQueryKey = ["profile"] as const;

interface ProfileFormState {
  firstName: string;
  lastName: string;
  nickname: string;
  language: ProfileLanguage;
  theme: ProfileTheme;
}

const initialFormState: ProfileFormState = {
  firstName: "",
  lastName: "",
  nickname: "",
  language: "en",
  theme: "system",
};

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { accessToken, logout, updateUser, user } = useAuth();
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
      language: profileQuery.data.language,
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

  const onMutationError = (error: Error) => {
    setServerError(error.message);
  };

  const updateMutation = useMutation({
    mutationFn: (input: UpdateProfileRequest) =>
      updateProfile(accessToken ?? "", input),
    onMutate: onMutationStart,
    onError: onMutationError,
    onSuccess: (profile) => onMutationSuccess(profile, "Profile saved."),
  });

  const uploadMutation = useMutation({
    mutationFn: (avatar: File) => uploadProfileAvatar(accessToken ?? "", avatar),
    onMutate: onMutationStart,
    onError: onMutationError,
    onSuccess: (profile) =>
      onMutationSuccess(profile, "Profile photo updated."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProfileAvatar(accessToken ?? ""),
    onMutate: onMutationStart,
    onError: onMutationError,
    onSuccess: (profile) =>
      onMutationSuccess(profile, "Profile photo deleted."),
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
      language: form.language,
      theme: form.theme,
    });
  };

  const onAvatarSelected = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setClientError("Choose a JPEG, PNG, or WebP image.");
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
      <nav className="top-nav" aria-label="User">
        <Link href="/">Dashboard</Link>
        <Link href="/watchlist">Watchlist</Link>
        <span>{user?.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </nav>

      <header>
        <p className="eyebrow">Account settings</p>
        <h1>User Profile</h1>
        <p className="subtitle">
          Manage the personal details and preferences attached to your account.
        </p>
      </header>

      {profileQuery.isLoading ? (
        <p>Loading profile...</p>
      ) : profileQuery.error instanceof Error ? (
        <p className="error-text">{profileQuery.error.message}</p>
      ) : profile ? (
        <div className="profile-layout">
          <Card>
            <CardHeader>
              <h2>Profile photo</h2>
              <p>JPEG, PNG, or WebP. Maximum size: 5 MB.</p>
            </CardHeader>
            <CardContent className="profile-avatar-content">
              <Avatar
                alt={profile.nickname ?? profile.name}
                fallback={getInitials(profile)}
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
                  {uploadMutation.isPending ? "Uploading..." : "Upload or change photo"}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => deleteMutation.mutate()}
                  disabled={isSaving || !profile.avatarUrl}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete photo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2>Personal information</h2>
              <p>Your email address comes from your Google account.</p>
            </CardHeader>
            <CardContent>
              <form className="profile-form" onSubmit={onSubmit}>
                <div className="profile-field profile-field-full">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile.email} disabled readOnly />
                </div>
                <div className="profile-field">
                  <Label htmlFor="first-name">First name</Label>
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
                  <Label htmlFor="last-name">Last name</Label>
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
                  <Label htmlFor="nickname">Nickname</Label>
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
                  <Label htmlFor="language">Preferred language</Label>
                  <Select
                    id="language"
                    value={form.language}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        language: event.target.value as ProfileLanguage,
                      }))
                    }
                    disabled={isSaving}
                  >
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                    <option value="uk">Українська</option>
                  </Select>
                </div>
                <div className="profile-field">
                  <Label htmlFor="theme">Theme preference</Label>
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
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </Select>
                </div>
                <div className="profile-form-footer profile-field-full">
                  <Button type="submit" disabled={isSaving}>
                    {updateMutation.isPending ? "Saving..." : "Save changes"}
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

function getInitials(profile: UserDto): string {
  const personalInitials = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .map((value) => value?.[0])
    .join("");

  if (personalInitials) {
    return personalInitials.toUpperCase();
  }

  const fallback = profile.nickname ?? profile.name ?? profile.email;
  const words = fallback.trim().split(/\s+/);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : fallback)
    .slice(0, 2)
    .toUpperCase();
}
