# Blade

## Layouts

- `@extends('layouts.app')` + `@section('content')`
- Componentes Blade (`<x-alert />`) para UI reutilizável

## Escaping

- `{{ $var }}` escapa HTML por padrão
- `{!! $html !!}` só para conteúdo confiável/sanitizado

## Diretivas úteis

- `@auth` / `@guest`
- `@foreach`, `@forelse` (empty state)
- `@vite` para assets (Vite padrão Laravel)

## Dados para view

- Passar DTOs/view models — não models Eloquent crus com relações lazy-loaded inesperadas

## Evitar

- Lógica de negócio complexa na view
- Queries Eloquent dentro de Blade (`@foreach(User::all() as ...)`)

## Relacionado

- skill `php/references/security-basics.md` — XSS
- skill `atomic-design` — composição de UI
