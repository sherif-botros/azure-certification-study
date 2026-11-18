$ErrorActionPreference = 'Stop'
$repo = 'sherif-botros/azure-certification-study'
gh repo create $repo --public --source . --remote origin --description 'Sherif Be Azure Expert Solution Architect: certification study guide'
gh api -X POST "repos/$repo/pages" -f build_type=workflow
git push -u origin main
Write-Host "Site (ready in about 2 minutes): https://sherif-botros.github.io/azure-certification-study/"
